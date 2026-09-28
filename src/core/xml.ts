import { Lattice, Pt, Screen, Setup, Slice } from './types';
import { applyH, bboxOf, frameOf, homography, isIdentityish, quadPoint } from './geometry';

/**
 * Resolume Arena Advanced Output parser (6.x → 7.x).
 *
 * Reads, per screen: output device (Display, Virtual, Spout, NDI…), Slices and
 * Polygons with their input quad (composition space, may be rotated), output
 * quad, polygon contours and the BezierWarper lattice + Homography, so the
 * output view shows what the screen really receives. DMX screens and
 * DmxSlices are pixel-mapping fixtures and are skipped.
 */
export function parseResolumeXML(xml: string, fileName = ''): Setup {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error('Fichier XML illisible : ' + (err.textContent || '').split('\n')[0]);

  const root = doc.documentElement;
  if (root.tagName !== 'XmlState') throw new Error('Ce n’est pas un export Advanced Output de Resolume (balise XmlState absente).');
  const setupEl = child(root, 'ScreenSetup');
  if (!setupEl) throw new Error('Balise ScreenSetup absente : exporte le XML depuis Advanced Output > Presets.');

  const warnings: string[] = [];
  const vi = child(root, 'versionInfo');
  const version = vi
    ? `${vi.getAttribute('name') || 'Resolume'} ${vi.getAttribute('majorVersion') || '?'}.${vi.getAttribute('minorVersion') || '?'}.${vi.getAttribute('microVersion') || '?'}`
    : 'Resolume';

  const cts = child(setupEl, 'CurrentCompositionTextureSize');
  let comp = {
    w: num(cts?.getAttribute('width'), 0),
    h: num(cts?.getAttribute('height'), 0),
  };

  const screensEl = child(setupEl, 'screens');
  const screenEls = screensEl ? children(screensEl, 'Screen') : [];
  const dmxCount = screensEl ? children(screensEl, 'DmxScreen').length : 0;
  if (dmxCount) warnings.push(`${dmxCount} écran(s) DMX ignoré(s) (pixel mapping lumière).`);

  // Composition size fallback: bbox of every input rect
  if (!comp.w || !comp.h) {
    const all: Pt[] = [];
    screenEls.forEach(s => layerEls(s).forEach(l => all.push(...verts(child(l, 'InputRect')))));
    const bb = bboxOf(all);
    comp = { w: Math.round(bb.x + bb.w) || 1920, h: Math.round(bb.y + bb.h) || 1080 };
    warnings.push('Taille de composition absente du XML : déduite des slices.');
  }

  let globalIndex = 0;
  const screens: Screen[] = [];

  screenEls.forEach((sEl, si) => {
    const id = sEl.getAttribute('uniqueId') || `screen-${si}`;
    const name = paramValue(sEl, 'Params', 'Name') || sEl.getAttribute('name') || `Screen ${si + 1}`;
    const enabled = paramValue(sEl, 'Params', 'Enabled') !== '0';

    const odWrap = child(sEl, 'OutputDevice');
    const od = odWrap ? firstElement(odWrap) : null;
    const deviceType = od ? od.tagName.replace('OutputDevice', '') || 'Display' : 'Aucun';
    const device = { type: deviceType, name: od?.getAttribute('name') || '—' };
    let size = { w: num(od?.getAttribute('width'), 0), h: num(od?.getAttribute('height'), 0) };

    const slices: Slice[] = [];
    const lEls = layerEls(sEl);
    const rawOut = lEls.flatMap(l => verts(child(l, 'OutputRect')));

    if (!size.w || !size.h) {
      const bb = bboxOf(rawOut);
      size = { w: Math.round(bb.x + bb.w) || comp.w, h: Math.round(bb.y + bb.h) || comp.h };
    }

    // Very old presets store normalised coordinates (0..1 or -0.5..0.5)
    const outNorm = isNormalised(rawOut);
    const inNorm = isNormalised(lEls.flatMap(l => verts(child(l, 'InputRect'))));
    const denorm = (pts: Pt[], norm: 'no' | 'unit' | 'centred', w: number, h: number) =>
      norm === 'no' ? pts
        : norm === 'unit' ? pts.map(p => ({ x: p.x * w, y: p.y * h }))
          : pts.map(p => ({ x: (p.x + 0.5) * w, y: (p.y + 0.5) * h }));

    lEls.forEach((lEl, li) => {
      const input = denorm(verts(child(lEl, 'InputRect')), inNorm, comp.w, comp.h);
      const output = denorm(verts(child(lEl, 'OutputRect')), outNorm, size.w, size.h);
      if (input.length < 4 || output.length < 4) {
        warnings.push(`« ${name} » : une couche sans rectangle valide a été ignorée.`);
        return;
      }
      const kind = lEl.tagName === 'Polygon' ? 'polygon' : 'slice';
      const sliceName = paramValue(lEl, 'Common', 'Name') || (kind === 'polygon' ? 'Polygon' : 'Slice');
      const sEnabled = paramValue(lEl, 'Common', 'Enabled') !== '0';
      const src = choiceValue(lEl, 'Input', 'Input Source');

      const inContour = contour(child(lEl, 'InputContour'));
      const outContour = contour(child(lEl, 'OutputContour'));

      const slice: Slice = {
        id: lEl.getAttribute('uniqueId') || `${id}-${li}`,
        name: sliceName,
        kind,
        screenId: id,
        screenName: name,
        index: globalIndex++,
        enabled: sEnabled,
        source: sourceLabel(src),
        input: input.slice(0, 4),
        inputContour: inContour.length >= 3 ? denorm(inContour, inNorm, comp.w, comp.h) : undefined,
        output: output.slice(0, 4),
        outputContour: outContour.length >= 3 ? denorm(outContour, outNorm, size.w, size.h) : undefined,
        lattice: readLattice(lEl, output.slice(0, 4)),
        frame: frameOf(input.slice(0, 4)),
        bbox: bboxOf(input.slice(0, 4)),
        twins: [],
      };
      if (slice.frame.w < 1 || slice.frame.h < 1) return;
      slices.push(slice);
    });

    screens.push({ id, name, enabled, device, size, slices });
  });

  // Mark slices of different screens that sample the exact same input
  const byKey = new Map<string, Slice[]>();
  screens.flatMap(s => s.slices).forEach(sl => {
    const key = sl.input.map(p => `${Math.round(p.x)},${Math.round(p.y)}`).join('|');
    byKey.set(key, [...(byKey.get(key) || []), sl]);
  });
  byKey.forEach(group => {
    if (group.length > 1) group.forEach(sl => { sl.twins = group.filter(o => o !== sl).map(o => o.id); });
  });

  const total = screens.reduce((n, s) => n + s.slices.length, 0);
  if (!total) warnings.push('Aucune slice trouvée dans ce XML.');

  return {
    name: root.getAttribute('name') || fileName.replace(/\.xml$/i, '') || 'Setup Resolume',
    version,
    comp,
    screens,
    origin: 'xml',
    warnings,
  };
}

// ─── Manual / demo setups ───────────────────────────────────────

export function buildManualSetup(opts: {
  name: string; w: number; h: number; cols: number; rows: number; gap: number; screenW?: number; screenH?: number;
}): Setup {
  const { name, w, h, cols, rows, gap } = opts;
  const cw = (w - gap * (cols - 1)) / cols;
  const ch = (h - gap * (rows - 1)) / rows;
  const slices: Slice[] = [];
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = Math.round(c * (cw + gap)), y = Math.round(r * (ch + gap));
      const x2 = Math.round(c * (cw + gap) + cw), y2 = Math.round(r * (ch + gap) + ch);
      const q = [{ x, y }, { x: x2, y }, { x: x2, y: y2 }, { x, y: y2 }];
      slices.push({
        id: `m-${r}-${c}`,
        name: cols * rows === 1 ? 'Slice' : `Slice ${String.fromCharCode(65 + r)}${c + 1}`,
        kind: 'slice', screenId: 'm-screen', screenName: 'Écran', index: i++, enabled: true,
        source: 'Composition', input: q, output: q.map(p => ({ ...p })),
        frame: frameOf(q), bbox: bboxOf(q), twins: [],
      });
    }
  }
  return {
    name, version: 'Setup manuel', comp: { w, h }, origin: 'manual', warnings: [],
    screens: [{
      id: 'm-screen', name: 'Écran', enabled: true, device: { type: 'Virtual', name: 'Manuel' },
      size: { w: opts.screenW || w, h: opts.screenH || h }, slices,
    }],
  };
}

export const DEMO_SETUP = (): Setup => {
  const s = buildManualSetup({ name: 'Démo 1920×1080', w: 1920, h: 1080, cols: 1, rows: 1, gap: 0 });
  s.origin = 'demo';
  return s;
};

// ─── DOM helpers ────────────────────────────────────────────────

function child(el: Element | null | undefined, tag: string): Element | null {
  if (!el) return null;
  for (const c of Array.from(el.children)) if (c.tagName === tag) return c;
  return null;
}
function children(el: Element, tag: string): Element[] {
  return Array.from(el.children).filter(c => c.tagName === tag);
}
function firstElement(el: Element): Element | null {
  return el.firstElementChild;
}
function layerEls(screen: Element): Element[] {
  const layers = child(screen, 'layers');
  return layers ? Array.from(layers.children).filter(c => c.tagName === 'Slice' || c.tagName === 'Polygon') : [];
}
function num(v: string | null | undefined, fb: number) {
  const n = parseFloat(v ?? '');
  return isFinite(n) ? n : fb;
}
function verts(el: Element | null): Pt[] {
  if (!el) return [];
  return children(el, 'v').map(v => ({ x: num(v.getAttribute('x'), 0), y: num(v.getAttribute('y'), 0) }));
}
function contour(el: Element | null): Pt[] {
  return verts(child(el, 'points'));
}
function paramValue(el: Element, group: string, name: string): string | null {
  for (const p of children(el, 'Params')) {
    if (p.getAttribute('name') !== group) continue;
    for (const c of Array.from(p.children)) if (c.getAttribute('name') === name) return c.getAttribute('value');
  }
  return null;
}
function choiceValue(el: Element, group: string, name: string) {
  return paramValue(el, group, name) || '';
}
function sourceLabel(v: string) {
  if (!v || v === '0:1') return 'Composition';
  const [kind, n] = v.split(':');
  if (kind === '1') return `Couche ${n}`;
  if (kind === '2') return `Colonne ${n}`;
  if (kind === '3') return `Groupe ${n}`;
  return `Source ${v}`;
}
function isNormalised(pts: Pt[]): 'no' | 'unit' | 'centred' {
  if (!pts.length) return 'no';
  const bb = bboxOf(pts);
  if (bb.x + bb.w > 1.5 || bb.y + bb.h > 1.5 || bb.x < -1 || bb.y < -1) return 'no';
  return bb.x < -0.1 || bb.y < -0.1 ? 'centred' : 'unit';
}

function readLattice(lEl: Element, outQuad: Pt[]): Lattice | undefined {
  const warper = child(lEl, 'Warper');
  if (!warper) return undefined;
  const bz = child(warper, 'BezierWarper');
  const hEl = child(warper, 'Homography');
  let pts: Pt[] = [];
  let cols = 2, rows = 2;
  if (bz) {
    cols = Math.max(2, num(bz.getAttribute('controlWidth'), 2));
    rows = Math.max(2, num(bz.getAttribute('controlHeight'), 2));
    pts = verts(child(bz, 'vertices'));
    if (pts.length !== cols * rows) pts = [];
  }
  if (!pts.length) { pts = [outQuad[0], outQuad[1], outQuad[3], outQuad[2]]; cols = 2; rows = 2; }

  // Homography (corner pin) applied on top of the lattice
  const src = verts(child(hEl, 'src'));
  const dst = verts(child(hEl, 'dst'));
  if (src.length === 4 && dst.length === 4 && !isIdentityish(src, dst)) {
    const H = homography(src, dst);
    if (H) pts = pts.map(p => applyH(H, p));
  }

  // Drop the lattice when it is just the plain output quad (fast path)
  const flat = pts.every((p, k) => {
    const c = k % cols, r = Math.floor(k / cols);
    const q = quadPoint(outQuad, c / (cols - 1), r / (rows - 1));
    return Math.abs(q.x - p.x) < 0.5 && Math.abs(q.y - p.y) < 0.5;
  });
  return flat ? undefined : { cols, rows, pts };
}
