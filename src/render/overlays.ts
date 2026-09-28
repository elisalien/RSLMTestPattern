import { DrawTarget, OverlayDef, Params } from '../core/types';
import { P, autoFont, circle, hline, lw, pill, text, vline } from './draw';
import { intersect, ratioLabel } from '../core/geometry';

const colorOf = (t: DrawTarget, p: Params, key = 'color', custom = 'custom') => {
  const m = P.s(p, key);
  return m === 'slice' ? t.color : m === 'white' ? '#ffffff' : m === 'black' ? '#000000' : P.s(p, custom, '#ffffff');
};
const COLOR_OPTS = [{ value: 'slice', label: 'Couleur de slice' }, { value: 'white', label: 'Blanc' }, { value: 'black', label: 'Noir' }, { value: 'custom', label: 'Personnalisée' }];

export const OVERLAYS: OverlayDef[] = [
  {
    id: 'border', name: 'Contour de slice', scope: 'slice',
    desc: 'Cadre sur le bord exact de chaque slice.',
    params: [
      { key: 'width', label: 'Épaisseur', type: 'range', min: 1, max: 32, step: 1, unit: 'px' },
      { key: 'color', label: 'Couleur', type: 'select', options: COLOR_OPTS },
      { key: 'custom', label: 'Personnalisée', type: 'color' },
    ],
    defaults: { width: 4, color: 'slice', custom: '#ffffff' },
    draw(ctx, t, p) {
      const w = lw(t, P.n(p, 'width', 4));
      ctx.fillStyle = colorOf(t, p);
      ctx.fillRect(0, 0, t.w, w); ctx.fillRect(0, t.h - w, t.w, w);
      ctx.fillRect(0, 0, w, t.h); ctx.fillRect(t.w - w, 0, w, t.h);
    },
  },
  {
    id: 'edges', name: 'Bords au pixel', scope: 'slice',
    desc: 'Ligne 1 px d’une couleur par côté (haut rouge, droite vert, bas bleu, gauche jaune). Un côté absent = image rognée ou overscan.',
    params: [{ key: 'arrows', label: 'Flèches et noms', type: 'toggle' }],
    defaults: { arrows: true },
    draw(ctx, t, p) {
      const w = lw(t, 1);
      ctx.fillStyle = '#ff2020'; ctx.fillRect(0, 0, t.w, w);
      ctx.fillStyle = '#20ff20'; ctx.fillRect(t.w - w, 0, w, t.h);
      ctx.fillStyle = '#2060ff'; ctx.fillRect(0, t.h - w, t.w, w);
      ctx.fillStyle = '#ffe020'; ctx.fillRect(0, 0, w, t.h);
      if (!P.b(p, 'arrows')) return;
      const s = autoFont(t, 0.025, 7, 40);
      const arrow = (x: number, y: number, dx: number, dy: number, c: string, lab: string) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - dx * s * 1.2 - dy * s * 0.6, y - dy * s * 1.2 - dx * s * 0.6);
        ctx.lineTo(x - dx * s * 1.2 + dy * s * 0.6, y - dy * s * 1.2 + dx * s * 0.6);
        ctx.closePath(); ctx.fill();
        text(ctx, lab, x - dx * s * 2.4, y - dy * s * 2.4, s * 0.7, { color: c, font: t.theme.font });
      };
      arrow(t.w / 2, 2, 0, -1, '#ff5050', 'haut');
      arrow(t.w - 2, t.h / 2, 1, 0, '#50ff50', 'droite');
      arrow(t.w / 2, t.h - 2, 0, 1, '#6090ff', 'bas');
      arrow(2, t.h / 2, -1, 0, '#ffe050', 'gauche');
    },
  },
  {
    id: 'labels', name: 'Étiquette de slice', scope: 'slice',
    desc: 'Nom, taille, position et ratio de chaque slice, sur un fond lisible.',
    params: [
      { key: 'place', label: 'Place', type: 'select', options: [{ value: 'center', label: 'Centre' }, { value: 'tl', label: 'Haut gauche' }, { value: 'bl', label: 'Bas gauche' }, { value: 'bc', label: 'Bas centre' }] },
      { key: 'size', label: 'Taille du texte', type: 'range', min: 1, max: 12, step: 0.5, unit: '%' },
      { key: 'name', label: 'Nom', type: 'toggle' },
      { key: 'res', label: 'Résolution et ratio', type: 'toggle' },
      { key: 'pos', label: 'Position dans la composition', type: 'toggle' },
      { key: 'screen', label: 'Écran de sortie', type: 'toggle' },
    ],
    defaults: { place: 'tl', size: 3.2, name: true, res: true, pos: true, screen: false },
    draw(ctx, t, p) {
      const lines: string[] = [];
      const twins = t.slice?.twins.length ? ` (+${t.slice.twins.length})` : '';
      if (P.b(p, 'name')) lines.push(`${t.index + 1} · ${t.label}${twins}`);
      if (P.b(p, 'res')) lines.push(`${Math.round(t.w)} × ${Math.round(t.h)} px · ${ratioLabel(t.w, t.h)}`);
      if (P.b(p, 'pos')) lines.push(`x ${Math.round(t.origin.x)}  y ${Math.round(t.origin.y)}${t.angle ? `  ${Math.round((t.angle * 180) / Math.PI)}°` : ''}`);
      if (P.b(p, 'screen') && t.slice) lines.push(`→ ${t.slice.screenName}`);
      if (!lines.length) return;
      const fs = Math.max(8, Math.min(t.w, t.h) * P.n(p, 'size', 3.2) / 100);
      const pad = fs * 0.8;
      const place = P.s(p, 'place');
      if (place === 'center') pill(ctx, lines, t.w / 2, t.h / 2, fs, { font: t.theme.font, accent: t.color });
      else if (place === 'tl') pill(ctx, lines, pad, pad, fs, { font: t.theme.font, align: 'left', vAlign: 'top', accent: t.color });
      else if (place === 'bl') pill(ctx, lines, pad, t.h - pad, fs, { font: t.theme.font, align: 'left', vAlign: 'bottom', accent: t.color });
      else pill(ctx, lines, t.w / 2, t.h - pad, fs, { font: t.theme.font, vAlign: 'bottom', accent: t.color });
    },
  },
  {
    id: 'center', name: 'Centre et diagonales', scope: 'slice',
    desc: 'Croix au centre exact, diagonales coin à coin.',
    params: [
      { key: 'diagonals', label: 'Diagonales', type: 'toggle' },
      { key: 'full', label: 'Croix pleine largeur', type: 'toggle' },
      { key: 'color', label: 'Couleur', type: 'select', options: COLOR_OPTS },
      { key: 'custom', label: 'Personnalisée', type: 'color' },
    ],
    defaults: { diagonals: true, full: false, color: 'white', custom: '#ffffff' },
    draw(ctx, t, p) {
      const c = colorOf(t, p);
      const cx = t.w / 2, cy = t.h / 2, s = Math.min(t.w, t.h) * 0.08;
      ctx.fillStyle = c;
      if (P.b(p, 'full')) { hline(ctx, 0, t.w, cy, lw(t, 1)); vline(ctx, cx, 0, t.h, lw(t, 1)); }
      else { hline(ctx, cx - s, cx + s, cy, lw(t, 2)); vline(ctx, cx, cy - s, cy + s, lw(t, 2)); }
      if (P.b(p, 'diagonals')) {
        ctx.strokeStyle = c; ctx.globalAlpha = 0.6; ctx.lineWidth = lw(t, 1);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(t.w, t.h); ctx.moveTo(t.w, 0); ctx.lineTo(0, t.h); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    },
  },
  {
    id: 'circle', name: 'Cercle de ratio', scope: 'slice',
    desc: 'Cercle parfait inscrit : s’il sort ovale à l’écran, le ratio est faux (image étirée).',
    params: [{ key: 'color', label: 'Couleur', type: 'select', options: COLOR_OPTS }, { key: 'custom', label: 'Personnalisée', type: 'color' }],
    defaults: { color: 'white', custom: '#ffffff' },
    draw(ctx, t, p) {
      ctx.strokeStyle = colorOf(t, p); ctx.lineWidth = lw(t, 2);
      circle(ctx, t.w / 2, t.h / 2, Math.min(t.w, t.h) / 2 - 2); ctx.stroke();
    },
  },
  {
    id: 'grid', name: 'Grille pixel', scope: 'slice',
    desc: 'Grille au pas exact en pixels, avec numéros de colonnes et lignes.',
    params: [
      { key: 'step', label: 'Pas', type: 'range', min: 8, max: 1024, step: 1, unit: 'px' },
      { key: 'from', label: 'Départ', type: 'select', options: [{ value: 'corner', label: 'Coin de la slice' }, { value: 'center', label: 'Centre de la slice' }, { value: 'comp', label: 'Composition' }] },
      { key: 'opacity', label: 'Opacité', type: 'range', min: 5, max: 100, step: 1, unit: '%' },
      { key: 'numbers', label: 'Numéros en px', type: 'toggle' },
      { key: 'color', label: 'Couleur', type: 'select', options: COLOR_OPTS },
      { key: 'custom', label: 'Personnalisée', type: 'color' },
    ],
    defaults: { step: 100, from: 'comp', opacity: 45, numbers: true, color: 'white', custom: '#ffffff' },
    draw(ctx, t, p) {
      const s = Math.max(4, P.n(p, 'step', 100));
      const from = P.s(p, 'from');
      let ox = 0, oy = 0;
      if (from === 'center') { ox = (t.w / 2) % s; oy = (t.h / 2) % s; }
      if (from === 'comp') { ox = ((-t.origin.x % s) + s) % s; oy = ((-t.origin.y % s) + s) % s; }
      ctx.globalAlpha = P.n(p, 'opacity', 45) / 100;
      ctx.fillStyle = colorOf(t, p);
      for (let x = ox; x <= t.w; x += s) vline(ctx, x, 0, t.h, lw(t, 1));
      for (let y = oy; y <= t.h; y += s) hline(ctx, 0, t.w, y, lw(t, 1));
      ctx.globalAlpha = 1;
      if (P.b(p, 'numbers')) {
        const fs = Math.max(7, Math.min(s * 0.2, 28));
        const base = from === 'comp' ? t.origin : { x: from === 'center' ? t.w / 2 : 0, y: from === 'center' ? t.h / 2 : 0 };
        for (let x = ox; x < t.w; x += s) text(ctx, String(Math.round(from === 'comp' ? base.x + x : x - (from === 'center' ? t.w / 2 : 0))), x + 2, fs * 0.7, fs, { align: 'left', font: t.theme.mono, color: '#fff', weight: 500 });
        for (let y = oy; y < t.h; y += s) if (y > fs * 1.5) text(ctx, String(Math.round(from === 'comp' ? base.y + y : y - (from === 'center' ? t.h / 2 : 0))), 2, y + fs * 0.7, fs, { align: 'left', font: t.theme.mono, color: '#fff', weight: 500 });
      }
    },
  },
  {
    id: 'safe', name: 'Zones de sécurité', scope: 'slice',
    desc: 'Cadres « action » et « titre » : ce qui reste visible si l’écran rogne les bords.',
    params: [
      { key: 'action', label: 'Zone action', type: 'range', min: 50, max: 100, step: 0.5, unit: '%' },
      { key: 'title', label: 'Zone titre', type: 'range', min: 50, max: 100, step: 0.5, unit: '%' },
      { key: 'labels', label: 'Noms des zones', type: 'toggle' },
    ],
    defaults: { action: 93, title: 90, labels: true },
    draw(ctx, t, p) {
      const zone = (pct: number, color: string, lab: string) => {
        const f = pct / 100, w = t.w * f, h = t.h * f, x = (t.w - w) / 2, y = (t.h - h) / 2;
        ctx.strokeStyle = color; ctx.lineWidth = lw(t, 1.5); ctx.setLineDash([Math.max(4, t.w * 0.01), Math.max(3, t.w * 0.006)]);
        ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
        if (P.b(p, 'labels')) text(ctx, `${lab} ${pct} %`, x + w - 4, y + autoFont(t, 0.018, 7, 24), autoFont(t, 0.018, 7, 24), { align: 'right', color, font: t.theme.font });
      };
      zone(P.n(p, 'action', 93), 'rgba(255,212,0,0.9)', 'action');
      zone(P.n(p, 'title', 90), 'rgba(63,208,201,0.9)', 'titre');
    },
  },
  {
    id: 'rulers', name: 'Règles', scope: 'slice',
    desc: 'Graduations en pixels sur les bords, comme une règle.',
    params: [
      { key: 'minor', label: 'Petit pas', type: 'range', min: 2, max: 100, step: 1, unit: 'px' },
      { key: 'major', label: 'Grand pas', type: 'range', min: 10, max: 1000, step: 10, unit: 'px' },
      { key: 'space', label: 'Valeurs', type: 'select', options: [{ value: 'slice', label: 'Depuis la slice' }, { value: 'comp', label: 'Composition' }] },
    ],
    defaults: { minor: 10, major: 100, space: 'slice' },
    draw(ctx, t, p) {
      const mi = Math.max(2, P.n(p, 'minor', 10)), ma = Math.max(mi, P.n(p, 'major', 100));
      const comp = P.s(p, 'space') === 'comp';
      const L = Math.min(t.w, t.h) * 0.03;
      const fs = Math.max(7, Math.min(L * 0.9, 22));
      ctx.fillStyle = '#fff';
      for (let x = 0; x <= t.w; x += mi) {
        const v = Math.round(x + (comp ? t.origin.x : 0));
        const big = v % ma === 0;
        const l = big ? L : L * 0.4;
        vline(ctx, x, 0, l, lw(t, 1)); vline(ctx, x, t.h - l, t.h, lw(t, 1));
        if (big && x > 0 && x < t.w - fs * 2) text(ctx, String(v), x + 2, L + fs * 0.6, fs, { align: 'left', font: t.theme.mono, weight: 500 });
      }
      for (let y = 0; y <= t.h; y += mi) {
        const v = Math.round(y + (comp ? t.origin.y : 0));
        const big = v % ma === 0;
        const l = big ? L : L * 0.4;
        hline(ctx, 0, l, y, lw(t, 1)); hline(ctx, t.w - l, t.w, y, lw(t, 1));
        if (big && y > fs * 2 && y < t.h - fs) text(ctx, String(v), L + 3, y, fs, { align: 'left', font: t.theme.mono, weight: 500 });
      }
    },
  },
  {
    id: 'corners', name: 'Coordonnées des coins', scope: 'slice',
    desc: 'Position exacte de chaque coin dans la composition.',
    params: [],
    defaults: {},
    draw(ctx, t) {
      const fs = autoFont(t, 0.022, 7, 28);
      const q = t.slice?.input;
      const pts = q ? q.map(v => `${Math.round(v.x)}, ${Math.round(v.y)}`) : [`0, 0`, `${t.w}, 0`, `${t.w}, ${t.h}`, `0, ${t.h}`];
      const pad = fs * 0.6;
      pill(ctx, [pts[0]], pad, pad + fs * 2.2, fs, { align: 'left', vAlign: 'top', font: t.theme.mono });
      pill(ctx, [pts[1]], t.w - pad, pad + fs * 2.2, fs, { align: 'right', vAlign: 'top', font: t.theme.mono });
      pill(ctx, [pts[2]], t.w - pad, t.h - pad, fs, { align: 'right', vAlign: 'bottom', font: t.theme.mono });
      pill(ctx, [pts[3]], pad, t.h - pad, fs, { align: 'left', vAlign: 'bottom', font: t.theme.mono });
    },
  },

  // ── Composition scope ──
  {
    id: 'overlaps', name: 'Chevauchements', scope: 'comp',
    desc: 'Hachure les zones où deux slices prennent la même image (edge blending, doublons).',
    params: [{ key: 'labels', label: 'Taille en px', type: 'toggle' }],
    defaults: { labels: true },
    draw(ctx, t, p, all) {
      const rects = all.filter(a => a.slice).map(a => ({ r: a.slice!.bbox, s: a.slice! }));
      for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
        if (rects[i].s.twins.includes(rects[j].s.id)) continue;
        const r = intersect(rects[i].r, rects[j].r);
        if (!r) continue;
        ctx.save();
        ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
        ctx.fillStyle = 'rgba(255,140,0,0.28)'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = 'rgba(255,160,40,0.9)'; ctx.lineWidth = lw(t, 2);
        const step = Math.max(8, Math.min(r.w, r.h, 200) * 0.15);
        ctx.beginPath();
        for (let k = -r.h; k < r.w; k += step) { ctx.moveTo(r.x + k, r.y + r.h); ctx.lineTo(r.x + k + r.h, r.y); }
        ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = '#ff9a1f'; ctx.lineWidth = lw(t, 2); ctx.strokeRect(r.x, r.y, r.w, r.h);
        if (P.b(p, 'labels')) pill(ctx, [`⚠ ${Math.round(r.w)} × ${Math.round(r.h)}`], r.x + r.w / 2, r.y + r.h / 2, Math.max(9, Math.min(r.w, r.h, 400) * 0.08), { bg: 'rgba(40,20,0,0.85)', fg: '#ffb45a', font: t.theme.font });
      }
    },
  },
  {
    id: 'info', name: 'Carte d’info', scope: 'comp',
    desc: 'Nom du show, setup, taille de composition et date, dans un coin de la composition.',
    params: [
      { key: 'place', label: 'Place', type: 'select', options: [{ value: 'br', label: 'Bas droite' }, { value: 'bl', label: 'Bas gauche' }, { value: 'tr', label: 'Haut droite' }, { value: 'tl', label: 'Haut gauche' }, { value: 'c', label: 'Centre' }] },
      { key: 'size', label: 'Taille', type: 'range', min: 0.5, max: 6, step: 0.1, unit: '%' },
      { key: 'date', label: 'Date du jour', type: 'toggle' },
    ],
    defaults: { place: 'br', size: 1.6, date: true },
    draw(ctx, t, p) {
      const s = t.setup;
      const lines = [
        t.label || s.name,
        `${s.name} · ${s.comp.w} × ${s.comp.h} (${ratioLabel(s.comp.w, s.comp.h)})`,
        `${s.screens.length} écran(s) · ${s.screens.reduce((n, sc) => n + sc.slices.length, 0)} slice(s)`,
      ];
      if (P.b(p, 'date')) lines.push(new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }));
      const fs = Math.max(9, Math.min(t.w, t.h) * P.n(p, 'size', 1.6) / 100);
      const pad = fs;
      const pl = P.s(p, 'place');
      const x = pl === 'c' ? t.w / 2 : pl.includes('l') ? pad : t.w - pad;
      const y = pl === 'c' ? t.h / 2 : pl.includes('t') ? pad : t.h - pad;
      pill(ctx, lines, x, y, fs, {
        font: t.theme.font, accent: t.theme.accent,
        align: pl === 'c' ? 'center' : pl.includes('l') ? 'left' : 'right',
        vAlign: pl === 'c' ? 'middle' : pl.includes('t') ? 'top' : 'bottom',
      });
    },
  },
  {
    id: 'comp-frame', name: 'Cadre de composition', scope: 'comp',
    desc: 'Bord et centre de la composition entière, par-dessus les slices.',
    params: [],
    defaults: {},
    draw(ctx, t) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = lw(t, 2);
      ctx.setLineDash([12, 8]); ctx.strokeRect(1, 1, t.w - 2, t.h - 2); ctx.setLineDash([]);
      ctx.fillStyle = '#fff';
      const s = Math.min(t.w, t.h) * 0.03;
      hline(ctx, t.w / 2 - s, t.w / 2 + s, t.h / 2, lw(t, 1)); vline(ctx, t.w / 2, t.h / 2 - s, t.h / 2 + s, lw(t, 1));
    },
  },
];

export const overlayById = (id: string) => OVERLAYS.find(o => o.id === id);

export const DEFAULT_OVERLAYS_ON = ['border', 'labels', 'center', 'circle'];
