import { DrawTarget, LoopTime, Pt, SceneState, Setup, Slice } from '../core/types';
import { drawTriangle, latticePoint, polygonPath, quadPoint } from '../core/geometry';
import { patternById, withDefaults } from './patterns';
import { OVERLAYS } from './overlays';
import { ANIMS } from './anims';
import { drawLogo, isLogoAnimated } from './logos';
import { sliceHsl, themeById } from './themes';
import { assets } from '../state/assets';

export interface RenderInput {
  setup: Setup;
  scene: SceneState;
  disabled: string[];
  /** Screens whose slices appear in the input view ('all' or ids). */
  screens: 'all' | string[];
  /** Screen drawn even if disabled in Resolume (the one shown in output view). */
  include?: string;
}

export function loopTime(frame: number, scene: Pick<SceneState, 'fps' | 'loopSeconds'>): LoopTime {
  const frames = Math.max(1, Math.round(scene.fps * scene.loopSeconds));
  const f = ((frame % frames) + frames) % frames;
  return { frame: f, frames, fps: scene.fps, phase: f / frames, seconds: f / scene.fps };
}

export function isAnimated(scene: SceneState) {
  return Object.values(scene.anims).some(a => a.enabled) || scene.logos.some(isLogoAnimated);
}

// ─── Targets ────────────────────────────────────────────────────

const setupIds = new WeakMap<Setup, number>();
let setupSeq = 0;
const setupId = (s: Setup) => {
  if (!setupIds.has(s)) setupIds.set(s, ++setupSeq);
  return setupIds.get(s)!;
};

export function activeSlices(inp: RenderInput): Slice[] {
  const off = new Set(inp.disabled);
  const seen = new Set<string>();
  const out: Slice[] = [];
  for (const sc of inp.setup.screens) {
    if (!sc.enabled && sc.id !== inp.include) continue;
    if (inp.screens !== 'all' && !inp.screens.includes(sc.id)) continue;
    for (const sl of sc.slices) {
      if (!sl.enabled || off.has(sl.id)) continue;
      // Twins (same input region on another screen) are drawn once
      if (sl.twins.some(id => seen.has(id))) continue;
      seen.add(sl.id);
      out.push(sl);
    }
  }
  return out;
}

export function buildTargets(inp: RenderInput, px: number): DrawTarget[] {
  const theme = themeById(inp.scene.themeId);
  return activeSlices(inp).map(sl => ({
    w: sl.frame.w, h: sl.frame.h, index: sl.index, slice: sl,
    color: sliceHsl(theme, sl.index), colorDark: sliceHsl(theme, sl.index, -theme.light * 0.72),
    label: sl.name, theme, setup: inp.setup, px,
    origin: { x: sl.frame.x, y: sl.frame.y }, angle: sl.frame.angle,
  }));
}

function compTarget(inp: RenderInput, px: number): DrawTarget {
  const theme = themeById(inp.scene.themeId);
  return {
    w: inp.setup.comp.w, h: inp.setup.comp.h, index: 0, slice: null,
    color: sliceHsl(theme, 0), colorDark: sliceHsl(theme, 0, -theme.light * 0.72),
    label: inp.scene.showTitle || inp.setup.name, theme, setup: inp.setup, px,
    origin: { x: 0, y: 0 }, angle: 0,
  };
}

/** Enter a slice's local frame (origin = first input vertex, rotated) and clip. */
function enter(ctx: CanvasRenderingContext2D, t: DrawTarget, clip = true) {
  ctx.save();
  const sl = t.slice;
  if (sl && clip && sl.inputContour) {
    polygonPath(ctx, sl.inputContour);
    ctx.clip();
  }
  ctx.translate(t.origin.x, t.origin.y);
  if (t.angle) ctx.rotate(t.angle);
  if (clip && !(sl && sl.inputContour)) {
    ctx.beginPath();
    ctx.rect(0, 0, t.w, t.h);
    ctx.clip();
  }
}

function safe(fn: () => void, what: string) {
  try { fn(); } catch (e) { console.error(`Rendu « ${what} » en erreur`, e); }
}

// ─── Renderer with layer caches ─────────────────────────────────

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export class Renderer {
  private patternLayer: HTMLCanvasElement | null = null;
  private staticLayer: HTMLCanvasElement | null = null;
  private patternKey = '';
  private staticKey = '';
  private inputBuf: HTMLCanvasElement | null = null;
  lastMs = 0;

  private ensure(c: HTMLCanvasElement | null, w: number, h: number) {
    if (c && c.width === Math.max(1, Math.round(w)) && c.height === Math.max(1, Math.round(h))) return c;
    return makeCanvas(w, h);
  }

  /** Draw the composition (input space) at `scale` into ctx (sized comp × scale). */
  renderInput(ctx: CanvasRenderingContext2D, inp: RenderInput, time: LoopTime, scale: number) {
    const t0 = performance.now();
    const { setup, scene } = inp;
    const W = setup.comp.w * scale, H = setup.comp.h * scale;
    const px = scale;
    const targets = buildTargets(inp, px);
    const comp = compTarget(inp, px);
    const pattern = patternById(scene.patternId);
    const pParams = withDefaults(pattern, scene.patternParams[pattern.id]);

    // ── Layer 1: background + pattern ──
    const pKey = JSON.stringify([setupId(setup), scene.patternId, scene.patternScope, pParams, scene.themeId, scene.transparentBg, inp.disabled, inp.screens, inp.include, scale, scene.showTitle]);
    if (pKey !== this.patternKey || !this.patternLayer) {
      this.patternLayer = this.ensure(this.patternLayer, W, H);
      const c = this.patternLayer.getContext('2d')!;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, W, H);
      c.setTransform(scale, 0, 0, scale, 0, 0);
      if (!scene.transparentBg) { c.fillStyle = '#000'; c.fillRect(0, 0, setup.comp.w, setup.comp.h); }
      const skipFill = scene.transparentBg && pattern.id === 'blank';
      if (!skipFill) {
        if (scene.patternScope === 'comp') {
          safe(() => { c.save(); pattern.draw(c, comp, pParams); c.restore(); }, pattern.name);
          const th = comp.theme;
          if (th.post) safe(() => th.post!(c, { x: 0, y: 0, w: comp.w, h: comp.h }), 'thème');
        } else {
          for (const t of targets) {
            safe(() => {
              enter(c, t);
              pattern.draw(c, t, pParams);
              if (t.theme.post) t.theme.post(c, { x: 0, y: 0, w: t.w, h: t.h });
              c.restore();
            }, pattern.name);
          }
        }
      }
      this.patternKey = pKey;
    }

    // ── Layer 2: static overlays + static logos ──
    const sKey = JSON.stringify([pKey, scene.overlays, scene.logos.filter(l => !isLogoAnimated(l)), assets.version()]);
    if (sKey !== this.staticKey || !this.staticLayer) {
      this.staticLayer = this.ensure(this.staticLayer, W, H);
      const c = this.staticLayer.getContext('2d')!;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, W, H);
      c.setTransform(scale, 0, 0, scale, 0, 0);
      for (const o of OVERLAYS) {
        const st = scene.overlays[o.id];
        if (!st?.enabled) continue;
        const p = withDefaults(o, st.params);
        if (o.scope === 'comp') safe(() => { c.save(); o.draw(c, comp, p, targets); c.restore(); }, o.name);
        else for (const t of targets) safe(() => { enter(c, t); o.draw(c, t, p, targets); c.restore(); }, o.name);
      }
      this.drawLogos(c, inp, targets, comp, null, false);
      this.staticKey = sKey;
    }

    // ── Compose frame ──
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const scroll = scene.anims.scroll;
    if (scroll?.enabled) this.drawScrolled(ctx, inp, targets, comp, time, scale);
    else ctx.drawImage(this.patternLayer, 0, 0);
    ctx.drawImage(this.staticLayer, 0, 0);

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    for (const a of ANIMS) {
      const st = scene.anims[a.id];
      if (!st?.enabled || a.id === 'scroll') continue;
      const p = withDefaults(a, st.params);
      if (a.scope === 'comp') safe(() => { ctx.save(); a.draw(ctx, comp, p, time, targets); ctx.restore(); }, a.name);
      else for (const t of targets) safe(() => { enter(ctx, t); a.draw(ctx, t, p, time, targets); ctx.restore(); }, a.name);
    }
    this.drawLogos(ctx, inp, targets, comp, time, true);
    ctx.restore();
    this.lastMs = performance.now() - t0;
  }

  private drawLogos(ctx: CanvasRenderingContext2D, inp: RenderInput, targets: DrawTarget[], comp: DrawTarget, time: LoopTime | null, animated: boolean) {
    for (const l of inp.scene.logos) {
      if (!l.enabled || isLogoAnimated(l) !== animated || !assets.get(l.assetId)) continue;
      if (l.target === 'comp') { safe(() => { ctx.save(); drawLogo(ctx, l, comp, time); ctx.restore(); }, l.name); continue; }
      for (const t of targets) {
        if (l.target === 'pick' && !l.sliceIds.includes(t.slice!.id)) continue;
        safe(() => { enter(ctx, t); drawLogo(ctx, l, t, time); ctx.restore(); }, l.name);
      }
    }
  }

  private drawScrolled(ctx: CanvasRenderingContext2D, inp: RenderInput, targets: DrawTarget[], comp: DrawTarget, time: LoopTime, scale: number) {
    const st = inp.scene.anims.scroll;
    const cyc = Math.max(1, Math.round(Number(st.params.cycles ?? 1)));
    const dir = String(st.params.dir ?? 'h');
    const ph = (time.phase * cyc) % 1;
    const src = this.patternLayer!;
    const list = inp.scene.patternScope === 'comp' ? [comp] : targets;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (!inp.scene.transparentBg) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, inp.setup.comp.w, inp.setup.comp.h); }
    for (const t of list) {
      enter(ctx, t);
      const dx = dir !== 'v' ? ph * t.w : 0, dy = dir !== 'h' ? ph * t.h : 0;
      // Draw the slice's own pattern region 4× shifted with wrap-around
      for (const ox of [0, -t.w]) for (const oy of [0, -t.h]) {
        ctx.save();
        ctx.translate(dx + ox, dy + oy);
        if (t.angle) ctx.rotate(-t.angle);
        ctx.translate(-t.origin.x, -t.origin.y);
        ctx.scale(1 / scale, 1 / scale);
        ctx.drawImage(src, 0, 0);
        ctx.restore();
      }
      ctx.restore();
    }
  }

  /** Output view of one screen: input frame warped through each slice. */
  renderOutput(ctx: CanvasRenderingContext2D, inp: RenderInput, screenId: string, time: LoopTime, scale: number, guides: boolean) {
    const sc = inp.setup.screens.find(s => s.id === screenId);
    if (!sc) return;
    const all: RenderInput = { ...inp, screens: 'all', include: screenId };
    this.inputBuf = this.ensure(this.inputBuf, inp.setup.comp.w * scale, inp.setup.comp.h * scale);
    const ic = this.inputBuf.getContext('2d')!;
    this.renderInput(ic, all, time, scale);
    const t0 = performance.now();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (!inp.scene.transparentBg) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const off = new Set(inp.disabled);
    const S = (p: Pt) => ({ x: p.x * scale, y: p.y * scale });

    for (const sl of sc.slices) {
      if (!sl.enabled || off.has(sl.id)) continue;
      safe(() => {
        ctx.save();
        if (sl.outputContour) { polygonPath(ctx, sl.outputContour); ctx.clip(); }
        const simple = !sl.lattice && sl.frame.angle === 0 && isAxisRect(sl.output);
        if (simple) {
          const b = sl.bbox;
          const o = bbox4(sl.output);
          ctx.drawImage(this.inputBuf!, b.x * scale, b.y * scale, b.w * scale, b.h * scale, o.x, o.y, o.w, o.h);
        } else {
          const n = sl.lattice ? Math.max(8, (sl.lattice.cols - 1) * 4) : 8;
          const m = sl.lattice ? Math.max(8, (sl.lattice.rows - 1) * 4) : 8;
          const dst = (u: number, v: number) => (sl.lattice ? latticePoint(sl.lattice, u, v) : quadPoint(sl.output, u, v));
          const srcP = (u: number, v: number) => S(quadPoint(sl.input, u, v));
          // Source and destination points are both in canvas pixels here
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
            const u0 = i / n, u1 = (i + 1) / n, v0 = j / m, v1 = (j + 1) / m;
            const d00 = S(dst(u0, v0)), d10 = S(dst(u1, v0)), d11 = S(dst(u1, v1)), d01 = S(dst(u0, v1));
            const s00 = srcP(u0, v0), s10 = srcP(u1, v0), s11 = srcP(u1, v1), s01 = srcP(u0, v1);
            drawTriangle(ctx, this.inputBuf!, s00, s10, s11, d00, d10, d11);
            drawTriangle(ctx, this.inputBuf!, s00, s11, s01, d00, d11, d01);
          }
          ctx.restore();
        }
        ctx.restore();
      }, sl.name);
    }

    if (guides) {
      ctx.lineWidth = 1.5 / scale;
      for (const sl of sc.slices) {
        if (!sl.enabled || off.has(sl.id)) continue;
        ctx.strokeStyle = 'rgba(63,208,201,0.9)';
        polygonPath(ctx, sl.outputContour || (sl.lattice ? latticeOutline(sl) : sl.output));
        ctx.stroke();
      }
    }
    ctx.restore();
    this.lastMs += performance.now() - t0;
  }

  invalidate() { this.patternKey = ''; this.staticKey = ''; }
}

function isAxisRect(q: Pt[]) {
  return Math.abs(q[0].y - q[1].y) < 0.01 && Math.abs(q[3].y - q[2].y) < 0.01 && Math.abs(q[0].x - q[3].x) < 0.01 && Math.abs(q[1].x - q[2].x) < 0.01;
}
function bbox4(q: Pt[]) {
  const xs = q.map(p => p.x), ys = q.map(p => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
function latticeOutline(sl: Slice): Pt[] {
  const pts: Pt[] = [];
  const N = 16;
  for (let i = 0; i <= N; i++) pts.push(latticePoint(sl.lattice!, i / N, 0));
  for (let i = 0; i <= N; i++) pts.push(latticePoint(sl.lattice!, 1, i / N));
  for (let i = N; i >= 0; i--) pts.push(latticePoint(sl.lattice!, i / N, 1));
  for (let i = N; i >= 0; i--) pts.push(latticePoint(sl.lattice!, 0, i / N));
  return pts;
}
