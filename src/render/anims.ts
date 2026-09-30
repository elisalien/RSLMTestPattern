import { AnimDef, DrawTarget, LoopTime } from '../core/types';
import { CYCLE, P, TAU, circle, lw, pill, text } from './draw';

/** Triangle wave 0→1→0, whole-cycle safe. */
const tri = (x: number) => 1 - Math.abs(((x % 1) + 1) % 1 * 2 - 1);

const timecode = (time: LoopTime) => {
  const f = time.frame % time.fps;
  const s = Math.floor(time.frame / time.fps);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `00:00:${pad(s)}:${pad(f)}`;
};

export const ANIMS: AnimDef[] = [
  {
    id: 'sweep', name: 'Barre de balayage', scope: 'slice',
    desc: 'Barre qui traverse l’image : déchirures (tearing), saccades, synchro entre écrans.',
    params: [
      { key: 'dir', label: 'Sens', type: 'select', options: [{ value: 'h', label: 'Gauche → droite' }, { value: 'v', label: 'Haut → bas' }, { value: 'both', label: 'Les deux' }] },
      { key: 'cycles', label: 'Passages par boucle', type: 'range', min: 1, max: 16, step: 1 },
      { key: 'width', label: 'Largeur', type: 'range', min: 1, max: 200, step: 1, unit: 'px' },
      { key: 'color', label: 'Couleur', type: 'color' },
      { key: 'space', label: 'Espace', type: 'select', options: [{ value: 'slice', label: 'Chaque slice' }, { value: 'comp', label: 'Composition (continu)' }], help: '« Composition » : la même barre traverse toutes les slices, pratique pour vérifier leur ordre.' },
    ],
    defaults: { dir: 'h', cycles: 1, width: 12, color: '#ffffff', space: 'slice' },
    draw(ctx, t, p, time) {
      const ph = CYCLE(time.phase, P.n(p, 'cycles', 1));
      const w = P.n(p, 'width', 12);
      const comp = P.s(p, 'space') === 'comp' && t.angle === 0;
      const W = comp ? t.setup.comp.w : t.w, H = comp ? t.setup.comp.h : t.h;
      const ox = comp ? t.origin.x : 0, oy = comp ? t.origin.y : 0;
      ctx.fillStyle = P.s(p, 'color');
      const dir = P.s(p, 'dir');
      if (dir !== 'v') ctx.fillRect(ph * (W + w) - w - ox, 0, w, t.h);
      if (dir !== 'h') ctx.fillRect(0, ph * (H + w) - w - oy, t.w, w);
    },
  },
  {
    id: 'counter', name: 'Compteur d’images', scope: 'slice',
    desc: 'Numéro d’image, timecode et carré qui clignote une image sur deux : une image perdue se voit tout de suite.',
    params: [
      { key: 'place', label: 'Place', type: 'select', options: [{ value: 'tr', label: 'Haut droite' }, { value: 'c', label: 'Centre' }, { value: 'br', label: 'Bas droite' }] },
      { key: 'size', label: 'Taille', type: 'range', min: 1, max: 15, step: 0.5, unit: '%' },
      { key: 'blink', label: 'Carré pair / impair', type: 'toggle' },
    ],
    defaults: { place: 'tr', size: 4, blink: true },
    draw(ctx, t, p, time) {
      const fs = Math.max(9, Math.min(t.w, t.h) * P.n(p, 'size', 4) / 100);
      const pl = P.s(p, 'place');
      const x = pl === 'c' ? t.w / 2 : t.w - fs * 0.8;
      const y = pl === 'c' ? t.h / 2 + fs * 2 : pl === 'tr' ? fs * 0.8 : t.h - fs * 0.8;
      const box = pill(ctx, [`${String(time.frame).padStart(4, '0')} / ${time.frames}`, timecode(time)], x, y, fs, {
        font: t.theme.mono, align: pl === 'c' ? 'center' : 'right', vAlign: pl === 'c' ? 'middle' : pl === 'tr' ? 'top' : 'bottom', accent: t.color,
      });
      if (P.b(p, 'blink') && box) {
        ctx.fillStyle = time.frame % 2 ? '#ffffff' : '#000000';
        ctx.fillRect(box.x - fs * 1.4, box.y, fs * 1.1, fs * 1.1);
        ctx.strokeStyle = '#888'; ctx.lineWidth = lw(t, 1); ctx.strokeRect(box.x - fs * 1.4, box.y, fs * 1.1, fs * 1.1);
      }
    },
  },
  {
    id: 'flash', name: 'Flash de synchro', scope: 'slice',
    desc: 'Flash blanc au début de chaque boucle, sur toutes les slices en même temps : compare la latence entre écrans.',
    params: [
      { key: 'frames', label: 'Durée du flash', type: 'range', min: 1, max: 30, step: 1, unit: 'img' },
      { key: 'per', label: 'Flashs par boucle', type: 'range', min: 1, max: 8, step: 1 },
      { key: 'color', label: 'Couleur', type: 'color' },
    ],
    defaults: { frames: 2, per: 1, color: '#ffffff' },
    draw(ctx, t, p, time) {
      const per = Math.max(1, Math.round(P.n(p, 'per', 1)));
      const len = time.frames / per;
      if (time.frame % len < P.n(p, 'frames', 2)) {
        ctx.fillStyle = P.s(p, 'color'); ctx.fillRect(0, 0, t.w, t.h);
      }
    },
  },
  {
    id: 'chase', name: 'Chenillard de slices', scope: 'slice',
    desc: 'Les slices s’allument une par une dans l’ordre des numéros : repère l’ordre et le câblage.',
    params: [
      { key: 'opacity', label: 'Intensité', type: 'range', min: 10, max: 100, step: 1, unit: '%' },
      { key: 'tours', label: 'Tours par boucle', type: 'range', min: 1, max: 8, step: 1 },
    ],
    defaults: { opacity: 70, tours: 1 },
    draw(ctx, t, p, time, all) {
      const n = Math.max(1, all.length);
      const pos = CYCLE(time.phase, P.n(p, 'tours', 1)) * n;
      const k = all.indexOf(t);
      if (Math.floor(pos) !== k) return;
      const fade = 1 - (pos - k);
      ctx.globalAlpha = (P.n(p, 'opacity', 70) / 100) * (0.4 + 0.6 * fade);
      ctx.fillStyle = t.color; ctx.fillRect(0, 0, t.w, t.h);
      ctx.globalAlpha = 1;
    },
  },
  {
    id: 'radar', name: 'Radar', scope: 'slice',
    desc: 'Rayon qui tourne autour du centre, avec traînée.',
    params: [
      { key: 'cycles', label: 'Tours par boucle', type: 'range', min: 1, max: 12, step: 1 },
      { key: 'trail', label: 'Traînée', type: 'range', min: 0, max: 180, step: 5, unit: '°' },
      { key: 'color', label: 'Couleur', type: 'color' },
    ],
    defaults: { cycles: 1, trail: 60, color: '#3fd0c9' },
    draw(ctx, t, p, time) {
      const a = CYCLE(time.phase, P.n(p, 'cycles', 1)) * TAU - Math.PI / 2;
      const R = Math.hypot(t.w, t.h) / 2;
      const cx = t.w / 2, cy = t.h / 2;
      const trail = (P.n(p, 'trail', 60) * Math.PI) / 180;
      const col = P.s(p, 'color');
      const steps = 24;
      for (let i = 0; i < steps && trail > 0; i++) {
        const a0 = a - trail * (i + 1) / steps, a1 = a - trail * i / steps;
        ctx.globalAlpha = 0.35 * (1 - i / steps);
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = col; ctx.lineWidth = lw(t, 3);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
    },
  },
  {
    id: 'bounce', name: 'Carré rebondissant', scope: 'slice',
    desc: 'Carré qui rebondit sur les bords façon logo DVD : fluidité du mouvement.',
    params: [
      { key: 'size', label: 'Taille', type: 'range', min: 2, max: 40, step: 1, unit: '%' },
      { key: 'cx', label: 'Allers-retours X', type: 'range', min: 1, max: 12, step: 1 },
      { key: 'cy', label: 'Allers-retours Y', type: 'range', min: 1, max: 12, step: 1 },
    ],
    defaults: { size: 10, cx: 3, cy: 2 },
    draw(ctx, t, p, time) {
      const s = Math.min(t.w, t.h) * P.n(p, 'size', 10) / 100;
      const x = tri(time.phase * P.n(p, 'cx', 3)) * (t.w - s);
      const y = tri(time.phase * P.n(p, 'cy', 2) + 0.25) * (t.h - s);
      const hue = (time.phase * 360 * 2) % 360;
      ctx.fillStyle = `hsl(${hue},90%,60%)`;
      ctx.fillRect(x, y, s, s);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = lw(t, 2); ctx.strokeRect(x, y, s, s);
    },
  },
  {
    id: 'scroll', name: 'Défilement de la mire', scope: 'slice',
    desc: 'Fait glisser la mire en boucle dans chaque slice : saccades et flou de mouvement.',
    params: [
      { key: 'dir', label: 'Sens', type: 'select', options: [{ value: 'h', label: 'Horizontal' }, { value: 'v', label: 'Vertical' }, { value: 'd', label: 'Diagonal' }] },
      { key: 'cycles', label: 'Tours par boucle', type: 'range', min: 1, max: 8, step: 1 },
    ],
    defaults: { dir: 'h', cycles: 1 },
    draw() { /* handled by the engine: shifts the cached pattern layer */ },
  },
  {
    id: 'marquee', name: 'Texte défilant', scope: 'slice',
    desc: 'Bandeau de texte qui défile en bas (nom du show, consigne…).',
    params: [
      { key: 'text', label: 'Texte', type: 'text', placeholder: 'Nom du show — test en cours' },
      { key: 'size', label: 'Hauteur', type: 'range', min: 3, max: 25, step: 1, unit: '%' },
      { key: 'cycles', label: 'Passages par boucle', type: 'range', min: 1, max: 8, step: 1 },
    ],
    defaults: { text: 'TEST PATTERN', size: 8, cycles: 1 },
    draw(ctx, t, p, time) {
      const h = t.h * P.n(p, 'size', 8) / 100;
      const str = (P.s(p, 'text') || t.label) + '   •   ';
      ctx.fillStyle = 'rgba(10,11,14,0.85)'; ctx.fillRect(0, t.h - h, t.w, h);
      ctx.font = `700 ${h * 0.6}px ${t.theme.font}`;
      const tw = Math.max(1, ctx.measureText(str).width);
      const reps = Math.ceil(t.w / tw) + 1;
      const off = CYCLE(time.phase, P.n(p, 'cycles', 1)) * tw;
      ctx.save(); ctx.beginPath(); ctx.rect(0, t.h - h, t.w, h); ctx.clip();
      for (let i = 0; i <= reps; i++) text(ctx, str, i * tw - off, t.h - h / 2, h * 0.6, { align: 'left', color: '#fff', font: t.theme.font, weight: 700, outline: null });
      ctx.restore();
    },
  },
  {
    id: 'colors', name: 'Cycle de couleurs', scope: 'slice',
    desc: 'Toute l’image passe par rouge, vert, bleu, blanc : compare la colorimétrie des écrans.',
    params: [
      { key: 'seq', label: 'Séquence', type: 'select', options: [{ value: 'rgbw', label: 'Rouge Vert Bleu Blanc' }, { value: 'rgbcmyw', label: 'RVB + CMJ + blanc' }, { value: 'hue', label: 'Teinte continue' }] },
      { key: 'opacity', label: 'Opacité', type: 'range', min: 10, max: 100, step: 1, unit: '%' },
    ],
    defaults: { seq: 'rgbw', opacity: 100 },
    draw(ctx, t, p, time) {
      const seq = P.s(p, 'seq');
      ctx.globalAlpha = P.n(p, 'opacity', 100) / 100;
      if (seq === 'hue') ctx.fillStyle = `hsl(${time.phase * 360},100%,50%)`;
      else {
        const list = seq === 'rgbw' ? ['#f00', '#0f0', '#00f', '#fff'] : ['#f00', '#0f0', '#00f', '#0ff', '#f0f', '#ff0', '#fff'];
        ctx.fillStyle = list[Math.min(list.length - 1, Math.floor(time.phase * list.length))];
      }
      ctx.fillRect(0, 0, t.w, t.h);
      ctx.globalAlpha = 1;
    },
  },
  {
    id: 'pulse', name: 'Cadre pulsé', scope: 'slice',
    desc: 'Le contour de la slice respire : repère les slices même dans une mire chargée.',
    params: [
      { key: 'cycles', label: 'Pulsations par boucle', type: 'range', min: 1, max: 16, step: 1 },
      { key: 'width', label: 'Épaisseur max', type: 'range', min: 2, max: 80, step: 1, unit: 'px' },
    ],
    defaults: { cycles: 2, width: 16 },
    draw(ctx, t, p, time) {
      const k = 0.5 - 0.5 * Math.cos(CYCLE(time.phase, P.n(p, 'cycles', 2)) * TAU);
      const w = Math.max(1, P.n(p, 'width', 16) * k);
      ctx.strokeStyle = t.color; ctx.globalAlpha = 0.4 + 0.6 * k; ctx.lineWidth = w;
      ctx.strokeRect(w / 2, w / 2, t.w - w, t.h - w);
      ctx.globalAlpha = 1;
    },
  },
  {
    id: 'clock', name: 'Horloge de boucle', scope: 'slice',
    desc: 'Cadran qui fait un tour exact par boucle : vérifie que la vidéo boucle sans saut.',
    params: [{ key: 'size', label: 'Taille', type: 'range', min: 3, max: 40, step: 1, unit: '%' }],
    defaults: { size: 10 },
    draw(ctx, t: DrawTarget, p, time) {
      const R = Math.min(t.w, t.h) * P.n(p, 'size', 10) / 200;
      const cx = t.w - R * 1.3, cy = t.h - R * 1.3;
      ctx.fillStyle = 'rgba(10,11,14,0.8)'; circle(ctx, cx, cy, R); ctx.fill();
      ctx.fillStyle = t.color;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * 0.9, -Math.PI / 2, -Math.PI / 2 + time.phase * TAU); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = lw(t, 2); circle(ctx, cx, cy, R); ctx.stroke();
      text(ctx, `${time.seconds.toFixed(1)} s`, cx, cy, R * 0.35, { font: t.theme.mono });
    },
  },
];

export const animById = (id: string) => ANIMS.find(a => a.id === id);
