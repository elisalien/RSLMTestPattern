import { DrawTarget, Params, PatternDef } from '../core/types';
import { P, TAU, autoFont, cachedPixels, circle, hline, lw, pill, text, vline } from './draw';
import { ratioLabel } from '../core/geometry';

const SMPTE75 = ['#bfbfbf', '#bfbf00', '#00bfbf', '#00bf00', '#bf00bf', '#bf0000', '#0000bf'];
const SMPTE100 = ['#ffffff', '#ffff00', '#00ffff', '#00ff00', '#ff00ff', '#ff0000', '#0000ff'];
const REVERSE75 = ['#0000bf', '#131313', '#bf00bf', '#131313', '#00bfbf', '#131313', '#bfbfbf'];

const gray = (v: number) => {
  const c = Math.round(Math.max(0, Math.min(1, v)) * 255);
  return `rgb(${c},${c},${c})`;
};

const SOLIDS: Record<string, string> = {
  red: '#ff0000', green: '#00ff00', blue: '#0000ff', white: '#ffffff', cyan: '#00ffff',
  magenta: '#ff00ff', yellow: '#ffff00', black: '#000000', gray50: '#808080', gray18: '#2e2e2e',
};

function stripePattern(ctx: CanvasRenderingContext2D, period: number, dir: 'h' | 'v' | 'c', a: string, b: string) {
  const s = Math.max(1, Math.round(period));
  const c = document.createElement('canvas');
  c.width = s * 2; c.height = s * 2;
  const x = c.getContext('2d')!;
  x.fillStyle = a; x.fillRect(0, 0, s * 2, s * 2);
  x.fillStyle = b;
  if (dir === 'v') x.fillRect(s, 0, s, s * 2);
  else if (dir === 'h') x.fillRect(0, s, s * 2, s);
  else { x.fillRect(s, 0, s, s); x.fillRect(0, s, s, s); }
  return ctx.createPattern(c, 'repeat')!;
}

function cornerCircles(ctx: CanvasRenderingContext2D, t: DrawTarget, r: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw(t, 2);
  for (const [cx, cy] of [[r, r], [t.w - r, r], [r, t.h - r], [t.w - r, t.h - r]]) {
    circle(ctx, cx, cy, r * 0.9); ctx.stroke();
    ctx.fillStyle = color;
    hline(ctx, cx - r * 0.9, cx + r * 0.9, cy, lw(t, 1));
    vline(ctx, cx, cy - r * 0.9, cy + r * 0.9, lw(t, 1));
  }
}

// ─── Registry ───────────────────────────────────────────────────

export const PATTERNS: PatternDef[] = [
  // ── Identification ──
  {
    id: 'mapping-id', name: 'Identification', category: 'Identification',
    desc: 'Une couleur et un grand numéro par slice : on voit tout de suite quelle slice sort où.',
    params: [
      { key: 'fill', label: 'Fond', type: 'select', options: [{ value: 'dark', label: 'Sombre teinté' }, { value: 'solid', label: 'Couleur pleine' }, { value: 'gradient', label: 'Dégradé' }] },
      { key: 'number', label: 'Grand numéro', type: 'toggle' },
      { key: 'diagonals', label: 'Diagonales', type: 'toggle' },
      { key: 'arrows', label: 'Flèche « haut »', type: 'toggle', help: 'Montre le sens : utile si une slice est retournée ou tournée.' },
    ],
    defaults: { fill: 'dark', number: true, diagonals: true, arrows: true },
    draw(ctx, t, p) {
      const fill = P.s(p, 'fill');
      if (fill === 'solid') ctx.fillStyle = t.color;
      else if (fill === 'gradient') {
        const g = ctx.createLinearGradient(0, 0, t.w, t.h);
        g.addColorStop(0, t.color); g.addColorStop(1, t.colorDark);
        ctx.fillStyle = g;
      } else ctx.fillStyle = t.colorDark;
      ctx.fillRect(0, 0, t.w, t.h);
      const ink = fill === 'solid' ? 'rgba(0,0,0,0.55)' : t.color;
      if (P.b(p, 'diagonals')) {
        ctx.strokeStyle = ink; ctx.lineWidth = lw(t, 2);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(t.w, t.h); ctx.moveTo(t.w, 0); ctx.lineTo(0, t.h); ctx.stroke();
      }
      if (P.b(p, 'number')) {
        const s = Math.min(t.h * 0.5, t.w * 0.4);
        text(ctx, String(t.index + 1), t.w / 2, t.h / 2, s, { color: fill === 'solid' ? '#000' : '#fff', font: t.theme.font, weight: 800, outline: fill === 'solid' ? null : 'rgba(0,0,0,0.7)' });
      }
      if (P.b(p, 'arrows')) {
        const s = autoFont(t, 0.07, 8);
        ctx.fillStyle = fill === 'solid' ? '#000' : '#fff';
        ctx.beginPath();
        ctx.moveTo(t.w / 2, s * 0.6); ctx.lineTo(t.w / 2 + s, s * 1.8); ctx.lineTo(t.w / 2 - s, s * 1.8);
        ctx.closePath(); ctx.fill();
        text(ctx, 'haut', t.w / 2, s * 2.6, s * 0.6, { color: ctx.fillStyle as string, font: t.theme.font, outline: null });
      }
    },
  },
  {
    id: 'mire-pro', name: 'Mire complète', category: 'Identification',
    desc: 'Mire tout-en-un : grille carrée, cercle de géométrie, barres, gris, fréquences et centre.',
    params: [
      { key: 'cells', label: 'Cases en largeur', type: 'range', min: 4, max: 48, step: 1 },
      { key: 'bg', label: 'Fond', type: 'select', options: [{ value: 'dark', label: 'Sombre' }, { value: 'slice', label: 'Couleur de slice' }, { value: 'gray', label: 'Gris 18 %' }] },
      { key: 'circle', label: 'Grand cercle', type: 'toggle' },
      { key: 'corners', label: 'Cercles de coin', type: 'toggle' },
    ],
    defaults: { cells: 16, bg: 'dark', circle: true, corners: true },
    draw(ctx, t, p) {
      const bg = P.s(p, 'bg');
      ctx.fillStyle = bg === 'slice' ? t.colorDark : bg === 'gray' ? '#2e2e2e' : t.theme.bg;
      ctx.fillRect(0, 0, t.w, t.h);
      // Square grid centred on the target
      const cell = t.w / Math.max(2, P.n(p, 'cells', 16));
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let x = t.w / 2 % cell; x <= t.w; x += cell) vline(ctx, x, 0, t.h, lw(t, 1));
      for (let y = t.h / 2 % cell; y <= t.h; y += cell) hline(ctx, 0, t.w, y, lw(t, 1));
      const m = Math.min(t.w, t.h);
      const cx = t.w / 2, cy = t.h / 2, R = m * 0.45;
      if (P.b(p, 'corners')) cornerCircles(ctx, t, m * 0.12, 'rgba(255,255,255,0.8)');
      if (P.b(p, 'circle')) {
        ctx.save();
        circle(ctx, cx, cy, R); ctx.clip();
        ctx.fillStyle = '#101010'; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
        // Colour bars band
        const bars = t.theme.bars || SMPTE75;
        const bw = (R * 2) / bars.length;
        bars.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(cx - R + i * bw, cy - R, bw + 0.5, R * 0.62); });
        // Grayscale band
        const steps = 11, gw = (R * 2) / steps;
        for (let i = 0; i < steps; i++) { ctx.fillStyle = gray(i / (steps - 1)); ctx.fillRect(cx - R + i * gw, cy - R * 0.38, gw + 0.5, R * 0.3); }
        // Frequency bursts (1 → 6 px)
        const bands = 6, fw = (R * 2) / bands;
        for (let i = 0; i < bands; i++) {
          ctx.fillStyle = stripePattern(ctx, i + 1, 'v', '#000', '#fff');
          ctx.save(); ctx.translate(Math.round(cx - R + i * fw), 0);
          ctx.fillRect(0, cy + R * 0.3, fw, R * 0.32);
          ctx.restore();
        }
        // Gradient ramp
        const g = ctx.createLinearGradient(cx - R, 0, cx + R, 0);
        g.addColorStop(0, '#000'); g.addColorStop(1, '#fff');
        ctx.fillStyle = g; ctx.fillRect(cx - R, cy + R * 0.62, R * 2, R * 0.4);
        ctx.restore();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = lw(t, 3);
        circle(ctx, cx, cy, R); ctx.stroke();
      }
      // Centre cross + centre label
      ctx.fillStyle = '#fff';
      hline(ctx, cx - m * 0.06, cx + m * 0.06, cy, lw(t, 2));
      vline(ctx, cx, cy - m * 0.06, cy + m * 0.06, lw(t, 2));
      pill(ctx, [t.label, `${Math.round(t.w)} × ${Math.round(t.h)}`], cx, cy - R * 0.08 - m * 0.0, autoFont(t, 0.035, 9, 60), { font: t.theme.font, accent: t.color });
    },
  },
  {
    id: 'uv-map', name: 'Carte UV', category: 'Identification',
    desc: 'Rouge = position horizontale, vert = verticale. Chaque pixel a une couleur unique : parfait pour vérifier un mapping.',
    params: [
      { key: 'div', label: 'Divisions', type: 'range', min: 2, max: 32, step: 1 },
      { key: 'labels', label: 'Coordonnées A1…', type: 'toggle' },
      { key: 'space', label: 'Espace', type: 'select', options: [{ value: 'target', label: 'Par slice' }, { value: 'comp', label: 'Composition entière' }], help: '« Composition entière » : les couleurs se suivent d’une slice à l’autre.' },
    ],
    defaults: { div: 8, labels: true, space: 'target' },
    draw(ctx, t, p) {
      const compSpace = P.s(p, 'space') === 'comp' && t.slice && t.angle === 0;
      const W = compSpace ? t.setup.comp.w : t.w, H = compSpace ? t.setup.comp.h : t.h;
      const ox = compSpace ? -t.origin.x : 0, oy = compSpace ? -t.origin.y : 0;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, t.w, t.h);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gx = ctx.createLinearGradient(ox, 0, ox + W, 0);
      gx.addColorStop(0, '#000'); gx.addColorStop(1, '#f00');
      ctx.fillStyle = gx; ctx.fillRect(0, 0, t.w, t.h);
      const gy = ctx.createLinearGradient(0, oy, 0, oy + H);
      gy.addColorStop(0, '#000'); gy.addColorStop(1, '#0f0');
      ctx.fillStyle = gy; ctx.fillRect(0, 0, t.w, t.h);
      ctx.restore();
      const d = Math.max(2, P.n(p, 'div', 8));
      const cw = W / d, ch = H / d;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      for (let i = 0; i <= d; i++) {
        vline(ctx, ox + i * cw, 0, t.h, lw(t, 1));
        hline(ctx, 0, t.w, oy + i * ch, lw(t, 1));
      }
      if (P.b(p, 'labels')) {
        const fs = Math.max(8, Math.min(cw, ch) * 0.22);
        for (let r = 0; r < d; r++) for (let c = 0; c < d; c++) {
          const x = ox + c * cw + cw / 2, y = oy + r * ch + ch / 2;
          if (x < -cw || y < -ch || x > t.w + cw || y > t.h + ch) continue;
          text(ctx, `${String.fromCharCode(65 + (r % 26))}${c + 1}`, x, y, fs, { font: t.theme.font, color: '#fff' });
        }
      }
    },
  },

  // ── Couleur ──
  {
    id: 'smpte', name: 'Barres SMPTE', category: 'Couleur',
    desc: 'Barres couleur SMPTE avec barres inversées et PLUGE (niveau du noir).',
    params: [{ key: 'level', label: 'Niveau', type: 'select', options: [{ value: '75', label: '75 %' }, { value: '100', label: '100 %' }] }],
    defaults: { level: '75' },
    draw(ctx, t, p) {
      const bars = t.theme.bars && t.theme.id !== 'studio' && t.theme.id !== 'broadcast' ? t.theme.bars : P.s(p, 'level') === '100' ? SMPTE100 : SMPTE75;
      const bw = t.w / 7;
      const top = t.h * 0.67, mid = t.h * 0.08;
      bars.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i * bw, 0, bw + 0.5, top); });
      REVERSE75.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i * bw, top, bw + 0.5, mid); });
      const y = top + mid, h = t.h - y;
      const w6 = (t.w * 5 / 7) / 4;
      const bottom = ['#00214c', '#ffffff', '#32006a', '#131313'];
      bottom.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i * w6, y, w6 + 0.5, h); });
      const px = t.w * 5 / 7, pw = bw / 3;
      ['#090909', '#131313', '#1d1d1d'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(px + i * pw, y, pw + 0.5, h); });
      ctx.fillStyle = '#131313'; ctx.fillRect(t.w * 6 / 7, y, bw + 1, h);
    },
  },
  {
    id: 'ebu', name: 'Barres EBU', category: 'Couleur',
    desc: 'Barres couleur européennes (blanc → noir), pleine hauteur.',
    params: [
      { key: 'level', label: 'Niveau', type: 'select', options: [{ value: '75', label: '75 %' }, { value: '100', label: '100 %' }] },
      { key: 'gray', label: 'Bande de gris en bas', type: 'toggle' },
    ],
    defaults: { level: '75', gray: true },
    draw(ctx, t, p) {
      const v = P.s(p, 'level') === '100' ? 'ff' : 'bf';
      const cols = ['#ffffff', `#${v}${v}00`, `#00${v}${v}`, `#00${v}00`, `#${v}00${v}`, `#${v}0000`, `#0000${v}`, '#000000'];
      const bw = t.w / 8;
      const h = P.b(p, 'gray') ? t.h * 0.8 : t.h;
      cols.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i * bw, 0, bw + 0.5, h); });
      if (P.b(p, 'gray')) {
        const g = ctx.createLinearGradient(0, 0, t.w, 0);
        g.addColorStop(0, '#000'); g.addColorStop(1, '#fff');
        ctx.fillStyle = g; ctx.fillRect(0, h, t.w, t.h - h);
      }
    },
  },
  {
    id: 'solid', name: 'Aplat', category: 'Couleur',
    desc: 'Couleur pleine : uniformité, pixels morts, balance des blancs entre projecteurs.',
    params: [
      { key: 'preset', label: 'Couleur', type: 'select', options: [
        { value: 'white', label: 'Blanc 100 %' }, { value: 'red', label: 'Rouge' }, { value: 'green', label: 'Vert' }, { value: 'blue', label: 'Bleu' },
        { value: 'cyan', label: 'Cyan' }, { value: 'magenta', label: 'Magenta' }, { value: 'yellow', label: 'Jaune' },
        { value: 'gray50', label: 'Gris 50 %' }, { value: 'gray18', label: 'Gris 18 %' }, { value: 'black', label: 'Noir' },
        { value: 'slice', label: 'Couleur de la slice' }, { value: 'custom', label: 'Personnalisée' },
      ] },
      { key: 'custom', label: 'Personnalisée', type: 'color' },
      { key: 'marks', label: 'Repères 3×3', type: 'toggle', help: 'Petites croix pour mesurer l’uniformité en 9 points.' },
    ],
    defaults: { preset: 'white', custom: '#ff7a00', marks: false },
    draw(ctx, t, p) {
      const k = P.s(p, 'preset');
      const c = k === 'custom' ? P.s(p, 'custom') : k === 'slice' ? t.color : SOLIDS[k] || '#fff';
      ctx.fillStyle = c; ctx.fillRect(0, 0, t.w, t.h);
      if (P.b(p, 'marks')) {
        ctx.fillStyle = k === 'black' || k === 'gray18' || k === 'blue' ? '#888' : '#000';
        const s = Math.min(t.w, t.h) * 0.02;
        for (const fx of [0.1, 0.5, 0.9]) for (const fy of [0.1, 0.5, 0.9]) {
          hline(ctx, t.w * fx - s, t.w * fx + s, t.h * fy, lw(t, 1));
          vline(ctx, t.w * fx, t.h * fy - s, t.h * fy + s, lw(t, 1));
        }
      }
    },
  },
  {
    id: 'ramps', name: 'Dégradés RVB', category: 'Couleur',
    desc: 'Rampes blanc, rouge, vert, bleu : banding, profondeur de bits, écrêtage.',
    params: [
      { key: 'steps', label: 'Paliers (0 = continu)', type: 'range', min: 0, max: 64, step: 1 },
      { key: 'dir', label: 'Sens', type: 'select', options: [{ value: 'h', label: 'Horizontal' }, { value: 'v', label: 'Vertical' }] },
    ],
    defaults: { steps: 0, dir: 'h' },
    draw(ctx, t, p) {
      const chans = ['#ffffff', '#ff0000', '#00ff00', '#0000ff'];
      const mask = [[1, 1, 1], [1, 0, 0], [0, 1, 0], [0, 0, 1]];
      const steps = Math.round(P.n(p, 'steps', 0));
      const hor = P.s(p, 'dir') !== 'v';
      const L = hor ? t.w : t.h, band = (hor ? t.h : t.w) / 4;
      chans.forEach((c, i) => {
        if (steps > 1) {
          for (let s = 0; s < steps; s++) {
            const v = Math.round((s / (steps - 1)) * 255);
            const [r, g, b] = mask[i].map(m => m * v);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            const a = (L / steps) * s;
            if (hor) ctx.fillRect(a, i * band, L / steps + 0.5, band + 0.5); else ctx.fillRect(i * band, a, band + 0.5, L / steps + 0.5);
          }
        } else {
          const g = hor ? ctx.createLinearGradient(0, 0, t.w, 0) : ctx.createLinearGradient(0, 0, 0, t.h);
          g.addColorStop(0, '#000'); g.addColorStop(1, c);
          ctx.fillStyle = g;
          if (hor) ctx.fillRect(0, i * band, t.w, band + 0.5); else ctx.fillRect(i * band, 0, band + 0.5, t.h);
        }
      });
    },
  },
  {
    id: 'hue', name: 'Spectre', category: 'Couleur',
    desc: 'Toutes les teintes, du clair au sombre : gamut et saturation.',
    params: [],
    defaults: {},
    draw(ctx, t) {
      const g = ctx.createLinearGradient(0, 0, t.w, 0);
      for (let i = 0; i <= 12; i++) g.addColorStop(i / 12, `hsl(${i * 30},100%,50%)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, t.w, t.h);
      const v = ctx.createLinearGradient(0, 0, 0, t.h);
      v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(0.5, 'rgba(255,255,255,0)');
      v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, t.w, t.h);
    },
  },

  // ── Luminance ──
  {
    id: 'gray-steps', name: 'Échelle de gris', category: 'Luminance',
    desc: 'Paliers de gris numérotés : contraste, gamma, linéarité.',
    params: [
      { key: 'steps', label: 'Paliers', type: 'range', min: 3, max: 32, step: 1 },
      { key: 'dir', label: 'Sens', type: 'select', options: [{ value: 'h', label: 'Horizontal' }, { value: 'v', label: 'Vertical' }] },
      { key: 'labels', label: 'Valeurs en %', type: 'toggle' },
    ],
    defaults: { steps: 11, dir: 'h', labels: true },
    draw(ctx, t, p) {
      const n = Math.round(P.n(p, 'steps', 11));
      const hor = P.s(p, 'dir') !== 'v';
      const L = (hor ? t.w : t.h) / n;
      for (let i = 0; i < n; i++) {
        const v = i / (n - 1);
        ctx.fillStyle = gray(v);
        if (hor) ctx.fillRect(i * L, 0, L + 0.5, t.h); else ctx.fillRect(0, i * L, t.w, L + 0.5);
        if (P.b(p, 'labels')) {
          const fs = Math.max(8, Math.min(L * 0.3, autoFont(t, 0.04)));
          const x = hor ? i * L + L / 2 : t.w / 2, y = hor ? t.h / 2 : i * L + L / 2;
          text(ctx, `${Math.round(v * 100)}`, x, y, fs, { font: t.theme.mono, color: v > 0.55 ? '#000' : '#fff', outline: null });
        }
      }
    },
  },
  {
    id: 'pluge', name: 'Noirs et blancs', category: 'Luminance',
    desc: 'PLUGE : cases proches du noir et du blanc. Si une case disparaît, le niveau est mal réglé.',
    params: [],
    defaults: {},
    draw(ctx, t) {
      const half = t.h / 2;
      ctx.fillStyle = '#000'; ctx.fillRect(0, half, t.w, half);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, t.w, half);
      const lows = [1, 2, 3, 4, 5, 7.5, 10, 15];
      const highs = [99, 98, 97, 96, 95, 92.5, 90, 85];
      const n = lows.length, cw = t.w / (n + 1), s = Math.min(cw * 0.7, half * 0.5);
      const fs = Math.max(8, s * 0.2);
      lows.forEach((v, i) => {
        const x = cw * (i + 1);
        ctx.fillStyle = gray(v / 100); ctx.fillRect(x - s / 2, half + half / 2 - s / 2, s, s);
        text(ctx, `${v} %`, x, half + half / 2 + s / 2 + fs, fs, { color: '#777', font: t.theme.mono, outline: null });
      });
      highs.forEach((v, i) => {
        const x = cw * (i + 1);
        ctx.fillStyle = gray(v / 100); ctx.fillRect(x - s / 2, half / 2 - s / 2, s, s);
        text(ctx, `${v} %`, x, half / 2 + s / 2 + fs, fs, { color: '#888', font: t.theme.mono, outline: null });
      });
    },
  },
  {
    id: 'gamma', name: 'Contrôle gamma', category: 'Luminance',
    desc: 'Lignes noir/blanc 1 px contre des gris calculés : la case qui se fond indique le gamma réel. Regarder à distance.',
    pixelExact: true,
    params: [],
    defaults: {},
    draw(ctx, t) {
      ctx.fillStyle = stripePattern(ctx, 1, 'h', '#000', '#fff');
      ctx.fillRect(0, 0, t.w, t.h);
      const gammas = [1.6, 1.8, 2.0, 2.2, 2.4, 2.6];
      const cw = t.w / gammas.length, s = Math.min(cw * 0.55, t.h * 0.4);
      gammas.forEach((g, i) => {
        const x = cw * i + cw / 2;
        ctx.fillStyle = gray(Math.pow(0.5, 1 / g));
        ctx.fillRect(x - s / 2, t.h / 2 - s / 2, s, s);
        pill(ctx, [`γ ${g.toFixed(1)}`], x, t.h / 2 + s / 2 + s * 0.2, Math.max(9, s * 0.13), { font: t.theme.mono });
      });
    },
  },

  // ── Géométrie ──
  {
    id: 'crosshatch', name: 'Quadrillage', category: 'Géométrie',
    desc: 'Lignes fines régulières : alignement, convergence, raccords entre projecteurs.',
    params: [
      { key: 'mode', label: 'Espacement', type: 'select', options: [{ value: 'px', label: 'En pixels' }, { value: 'div', label: 'En divisions' }] },
      { key: 'spacing', label: 'Pas (px)', type: 'range', min: 8, max: 512, step: 1, unit: 'px' },
      { key: 'div', label: 'Divisions', type: 'range', min: 2, max: 64, step: 1 },
      { key: 'width', label: 'Épaisseur', type: 'range', min: 1, max: 8, step: 1, unit: 'px' },
      { key: 'from', label: 'Départ', type: 'select', options: [{ value: 'center', label: 'Depuis le centre' }, { value: 'corner', label: 'Depuis le coin' }, { value: 'comp', label: 'Aligné composition' }] },
      { key: 'line', label: 'Couleur des lignes', type: 'color' },
      { key: 'bg', label: 'Fond', type: 'color' },
    ],
    defaults: { mode: 'px', spacing: 64, div: 16, width: 1, from: 'center', line: '#ffffff', bg: '#000000' },
    draw(ctx, t, p) {
      ctx.fillStyle = P.s(p, 'bg'); ctx.fillRect(0, 0, t.w, t.h);
      const byDiv = P.s(p, 'mode') === 'div';
      const sx = byDiv ? t.w / P.n(p, 'div', 16) : P.n(p, 'spacing', 64);
      const sy = byDiv ? t.h / P.n(p, 'div', 16) : sx;
      const from = P.s(p, 'from');
      let ox = 0, oy = 0;
      if (from === 'center') { ox = (t.w / 2) % sx; oy = (t.h / 2) % sy; }
      if (from === 'comp') { ox = ((-t.origin.x % sx) + sx) % sx; oy = ((-t.origin.y % sy) + sy) % sy; }
      const w = lw(t, P.n(p, 'width', 1));
      ctx.fillStyle = P.s(p, 'line');
      for (let x = ox; x <= t.w + 0.01; x += sx) vline(ctx, byDiv || from !== 'center' ? x + w / 2 * (x < 0.5 ? 1 : x > t.w - 0.5 ? -1 : 0) : x, 0, t.h, w);
      for (let y = oy; y <= t.h + 0.01; y += sy) hline(ctx, 0, t.w, byDiv || from !== 'center' ? y + w / 2 * (y < 0.5 ? 1 : y > t.h - 0.5 ? -1 : 0) : y, w);
    },
  },
  {
    id: 'checker', name: 'Damier', category: 'Géométrie',
    desc: 'Cases alternées : netteté, pixels, raccords de slices.',
    params: [
      { key: 'cell', label: 'Taille de case', type: 'range', min: 1, max: 512, step: 1, unit: 'px' },
      { key: 'align', label: 'Alignement', type: 'select', options: [{ value: 'slice', label: 'Sur la slice' }, { value: 'comp', label: 'Sur la composition' }] },
      { key: 'a', label: 'Couleur A', type: 'color' },
      { key: 'b', label: 'Couleur B', type: 'color' },
      { key: 'tint', label: 'Teinter avec la slice', type: 'toggle' },
    ],
    defaults: { cell: 64, align: 'slice', a: '#ffffff', b: '#000000', tint: false },
    draw(ctx, t, p) {
      const s = Math.max(1, P.n(p, 'cell', 64));
      const a = P.b(p, 'tint') ? t.color : P.s(p, 'a');
      const b = P.b(p, 'tint') ? t.colorDark : P.s(p, 'b');
      ctx.save();
      if (P.s(p, 'align') === 'comp' && t.slice) ctx.translate(-(t.origin.x % (s * 2)), -(t.origin.y % (s * 2)));
      ctx.fillStyle = stripePattern(ctx, s, 'c', a, b);
      ctx.fillRect(0, 0, t.w + s * 2, t.h + s * 2);
      ctx.restore();
    },
  },
  {
    id: 'convergence', name: 'Convergence', category: 'Géométrie',
    desc: 'Cercles et croix : un cercle ovale = image étirée, croix floue = mise au point.',
    params: [
      { key: 'grid', label: 'Croix en largeur', type: 'range', min: 2, max: 24, step: 1 },
      { key: 'rings', label: 'Cercles concentriques', type: 'range', min: 1, max: 12, step: 1 },
      { key: 'color', label: 'Couleur', type: 'color' },
    ],
    defaults: { grid: 8, rings: 4, color: '#ffffff' },
    draw(ctx, t, p) {
      ctx.fillStyle = t.theme.bg; ctx.fillRect(0, 0, t.w, t.h);
      const c = P.s(p, 'color');
      const n = P.n(p, 'grid', 8);
      const cell = t.w / n;
      const rows = Math.max(1, Math.round(t.h / cell));
      const ch = t.h / rows;
      ctx.fillStyle = c;
      const s = Math.min(cell, ch) * 0.18;
      for (let i = 0; i <= n; i++) for (let j = 0; j <= rows; j++) {
        const x = Math.min(Math.max(i * cell, 0.5), t.w - 0.5), y = Math.min(Math.max(j * ch, 0.5), t.h - 0.5);
        hline(ctx, x - s, x + s, y, lw(t, 1)); vline(ctx, x, y - s, y + s, lw(t, 1));
      }
      ctx.strokeStyle = c; ctx.lineWidth = lw(t, 1.5);
      const R = Math.min(t.w, t.h) / 2;
      const rings = P.n(p, 'rings', 4);
      for (let k = 1; k <= rings; k++) { circle(ctx, t.w / 2, t.h / 2, (R * k) / rings - 1); ctx.stroke(); }
      cornerCircles(ctx, t, Math.min(t.w, t.h) * 0.1, c);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(t.w, t.h); ctx.moveTo(t.w, 0); ctx.lineTo(0, t.h);
      ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;
    },
  },
  {
    id: 'cabinets', name: 'Cabinets LED', category: 'Géométrie',
    desc: 'Découpe en cabinets / dalles LED numérotés, avec sens de câblage.',
    params: [
      { key: 'cw', label: 'Largeur cabinet', type: 'range', min: 16, max: 1024, step: 1, unit: 'px' },
      { key: 'ch', label: 'Hauteur cabinet', type: 'range', min: 16, max: 1024, step: 1, unit: 'px' },
      { key: 'order', label: 'Numérotation', type: 'select', options: [{ value: 'rc', label: 'Ligne / colonne (A1)' }, { value: 'row', label: 'Série par lignes' }, { value: 'snake', label: 'Serpentin (câblage)' }, { value: 'col-snake', label: 'Serpentin vertical' }] },
      { key: 'start', label: 'Coin de départ', type: 'select', options: [{ value: 'tl', label: 'Haut gauche' }, { value: 'tr', label: 'Haut droite' }, { value: 'bl', label: 'Bas gauche' }, { value: 'br', label: 'Bas droite' }] },
      { key: 'path', label: 'Tracer le câblage', type: 'toggle' },
      { key: 'coords', label: 'Coordonnées pixel', type: 'toggle' },
    ],
    defaults: { cw: 128, ch: 128, order: 'snake', start: 'tl', path: true, coords: false },
    draw(ctx, t, p) {
      const cw = Math.max(4, P.n(p, 'cw', 128)), chh = Math.max(4, P.n(p, 'ch', 128));
      const cols = Math.ceil(t.w / cw - 0.01), rows = Math.ceil(t.h / chh - 0.01);
      const start = P.s(p, 'start'), order = P.s(p, 'order');
      const flipX = start === 'tr' || start === 'br', flipY = start === 'bl' || start === 'br';
      const centers: { x: number; y: number; n: number }[] = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = c * cw, y = r * chh;
        ctx.fillStyle = (r + c) % 2 ? t.colorDark : `color-mix(in srgb, ${t.color} 45%, #000)`;
        ctx.fillRect(x, y, cw, chh);
        const lc = flipX ? cols - 1 - c : c, lr = flipY ? rows - 1 - r : r;
        let n: number, lab: string;
        if (order === 'rc') { n = lr * cols + lc; lab = `${String.fromCharCode(65 + (lr % 26))}${lc + 1}`; }
        else if (order === 'row') { n = lr * cols + lc; lab = String(n + 1); }
        else if (order === 'snake') { n = lr * cols + (lr % 2 ? cols - 1 - lc : lc); lab = String(n + 1); }
        else { n = lc * rows + (lc % 2 ? rows - 1 - lr : lr); lab = String(n + 1); }
        centers.push({ x: x + Math.min(cw, t.w - x) / 2, y: y + Math.min(chh, t.h - y) / 2, n });
        const fs = Math.max(7, Math.min(cw, chh) * 0.22);
        text(ctx, lab, x + Math.min(cw, t.w - x) / 2, y + Math.min(chh, t.h - y) / 2, fs, { font: t.theme.font, weight: 700 });
        if (P.b(p, 'coords')) text(ctx, `${Math.round(t.origin.x + x)},${Math.round(t.origin.y + y)}`, x + 3, y + fs * 0.5, fs * 0.45, { font: t.theme.mono, align: 'left', outline: null, color: 'rgba(255,255,255,0.75)' });
      }
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let c = 0; c <= cols; c++) vline(ctx, Math.min(c * cw, t.w - 0.5), 0, t.h, lw(t, 1));
      for (let r = 0; r <= rows; r++) hline(ctx, 0, t.w, Math.min(r * chh, t.h - 0.5), lw(t, 1));
      if (P.b(p, 'path') && order !== 'rc' && centers.length > 1) {
        centers.sort((a, b) => a.n - b.n);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = lw(t, Math.max(1, Math.min(cw, chh) * 0.03));
        ctx.setLineDash([Math.min(cw, chh) * 0.08, Math.min(cw, chh) * 0.06]);
        ctx.beginPath(); centers.forEach((c, i) => (i ? ctx.lineTo(c.x, c.y + chh * 0.25) : ctx.moveTo(c.x, c.y + chh * 0.25))); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#3fd0c9'; circle(ctx, centers[0].x, centers[0].y + chh * 0.25, Math.min(cw, chh) * 0.07); ctx.fill();
      }
    },
  },

  // ── Netteté ──
  {
    id: 'zone-plate', name: 'Zone plate', category: 'Netteté',
    desc: 'Anneaux de fréquence croissante : moiré = mise à l’échelle ou compression.',
    pixelExact: true,
    params: [{ key: 'freq', label: 'Fréquence au bord', type: 'range', min: 10, max: 100, step: 1, unit: '%', help: '100 % = limite de Nyquist au bord de l’image.' }],
    defaults: { freq: 60 },
    draw(ctx, t, p) {
      const W = Math.round(t.w), H = Math.round(t.h);
      const f = P.n(p, 'freq', 60) / 100;
      const c = cachedPixels(`zp${f}`, W, H, (d, w, h) => {
        const cx = w / 2, cy = h / 2, rmax = Math.hypot(cx, cy);
        const k = (Math.PI * f) / (2 * rmax) * 2;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const r2 = (x - cx) ** 2 + (y - cy) ** 2;
          const v = 127.5 + 127.5 * Math.cos(k * r2 / 2);
          const i = (y * w + x) * 4;
          d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
        }
      });
      ctx.drawImage(c, 0, 0, t.w, t.h);
    },
  },
  {
    id: 'siemens', name: 'Étoile de Siemens', category: 'Netteté',
    desc: 'Rayons qui se resserrent au centre : réglage du focus des projecteurs.',
    params: [
      { key: 'spokes', label: 'Rayons', type: 'range', min: 8, max: 144, step: 4 },
      { key: 'count', label: 'Étoiles', type: 'select', options: [{ value: '1', label: '1 au centre' }, { value: '5', label: '5 (centre + coins)' }] },
    ],
    defaults: { spokes: 72, count: '5' },
    draw(ctx, t, p) {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, t.w, t.h);
      const n = P.n(p, 'spokes', 72);
      const m = Math.min(t.w, t.h);
      const star = (cx: number, cy: number, R: number) => {
        ctx.fillStyle = '#000';
        for (let i = 0; i < n; i += 2) {
          const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = '#000'; ctx.lineWidth = lw(t, 2);
        circle(ctx, cx, cy, R); ctx.stroke();
      };
      star(t.w / 2, t.h / 2, m * 0.42);
      if (P.s(p, 'count') === '5') {
        const r = m * 0.14;
        star(r * 1.15, r * 1.15, r); star(t.w - r * 1.15, r * 1.15, r);
        star(r * 1.15, t.h - r * 1.15, r); star(t.w - r * 1.15, t.h - r * 1.15, r);
      }
    },
  },
  {
    id: 'resolution', name: 'Résolution', category: 'Netteté',
    desc: 'Groupes de lignes de 1 à 8 px, horizontales et verticales : ce qui se voit encore = la netteté réelle.',
    pixelExact: true,
    params: [],
    defaults: {},
    draw(ctx, t) {
      ctx.fillStyle = '#202020'; ctx.fillRect(0, 0, t.w, t.h);
      const sizes = [1, 2, 3, 4, 6, 8];
      const cw = t.w / sizes.length;
      sizes.forEach((s, i) => {
        const x = Math.round(i * cw + cw * 0.1), w = Math.round(cw * 0.8);
        ctx.save(); ctx.translate(x, Math.round(t.h * 0.1));
        ctx.fillStyle = stripePattern(ctx, s, 'v', '#000', '#fff');
        ctx.fillRect(0, 0, w, Math.round(t.h * 0.3));
        ctx.restore();
        ctx.save(); ctx.translate(x, Math.round(t.h * 0.5));
        ctx.fillStyle = stripePattern(ctx, s, 'h', '#000', '#fff');
        ctx.fillRect(0, 0, w, Math.round(t.h * 0.3));
        ctx.restore();
        text(ctx, `${s} px`, i * cw + cw / 2, t.h * 0.9, Math.max(9, Math.min(cw * 0.15, t.h * 0.05)), { font: t.theme.mono, color: '#ddd', outline: null });
      });
    },
  },
  {
    id: 'pixel-stripes', name: 'Pixels alternés', category: 'Netteté',
    desc: 'Alternance au pixel près : une image grise uniforme = mise à l’échelle quelque part dans la chaîne.',
    pixelExact: true,
    params: [
      { key: 'dir', label: 'Motif', type: 'select', options: [{ value: 'v', label: 'Lignes verticales' }, { value: 'h', label: 'Lignes horizontales' }, { value: 'c', label: 'Damier 1 px' }] },
      { key: 'period', label: 'Largeur', type: 'range', min: 1, max: 8, step: 1, unit: 'px' },
    ],
    defaults: { dir: 'v', period: 1 },
    draw(ctx, t, p) {
      ctx.fillStyle = stripePattern(ctx, P.n(p, 'period', 1), P.s(p, 'dir') as 'h' | 'v' | 'c', '#000', '#fff');
      ctx.fillRect(0, 0, t.w, t.h);
      pill(ctx, ['Si tu vois du gris uni, l’image est redimensionnée'], t.w / 2, t.h / 2, autoFont(t, 0.03, 9, 40), { font: t.theme.font });
    },
  },
  {
    id: 'blank', name: 'Fond seul', category: 'Identification',
    desc: 'Fond du thème (ou transparent) : pour n’afficher que les repères, logos et animations.',
    params: [],
    defaults: {},
    draw(ctx, t) {
      ctx.fillStyle = t.theme.bg; ctx.fillRect(0, 0, t.w, t.h);
    },
  },
];

export const PATTERN_CATEGORIES = ['Identification', 'Couleur', 'Luminance', 'Géométrie', 'Netteté'];
export const patternById = (id: string) => PATTERNS.find(p => p.id === id) || PATTERNS[0];

export function describeTarget(t: DrawTarget) {
  return `${Math.round(t.w)}×${Math.round(t.h)} · ${ratioLabel(t.w, t.h)}`;
}

export function withDefaults(def: { defaults: Params }, p?: Params): Params {
  return { ...def.defaults, ...(p || {}) };
}
