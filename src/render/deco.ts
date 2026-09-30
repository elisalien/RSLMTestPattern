import { DrawTarget, LoopTime } from '../core/types';
import { TAU, rng } from './draw';

/** Decorative shapes sprinkled over each slice (the « petites étoiles »). */

export type DecoMotion = 'static' | 'float' | 'twinkle' | 'spin' | 'rise';

export interface DecoState {
  shapes: string[];
  density: number;   // 1-10
  size: number;      // % of default size
  opacity: number;   // 0-100
  motion: DecoMotion;
  cycles: number;    // whole cycles per loop
  palette: 'theme' | 'slice' | 'white' | 'rainbow';
  seed: number;
}

export const DEFAULT_DECO: DecoState = {
  shapes: [], density: 3, size: 100, opacity: 60, motion: 'static', cycles: 1, palette: 'theme', seed: 1,
};

export const DECO_SHAPES: { id: string; label: string; icon: string }[] = [
  { id: 'stars', label: 'Étoiles', icon: '✦' },
  { id: 'sparkles', label: 'Étincelles', icon: '✧' },
  { id: 'hearts', label: 'Cœurs', icon: '♥' },
  { id: 'music-notes', label: 'Notes', icon: '♪' },
  { id: 'flowers', label: 'Fleurs', icon: '✿' },
  { id: 'diamonds', label: 'Diamants', icon: '◆' },
  { id: 'clouds', label: 'Nuages', icon: '☁' },
  { id: 'pixels', label: 'Pixels', icon: '▦' },
  { id: 'circles', label: 'Bulles', icon: '◎' },
  { id: 'crosses', label: 'Croix', icon: '✚' },
  { id: 'arrows', label: 'Flèches', icon: '⬆' },
  { id: 'lightning', label: 'Éclairs', icon: 'ϟ' },
];

export const DECO_MOTIONS: { value: DecoMotion; label: string }[] = [
  { value: 'static', label: 'Fixes' },
  { value: 'float', label: 'Flottent' },
  { value: 'twinkle', label: 'Scintillent' },
  { value: 'spin', label: 'Tournent' },
  { value: 'rise', label: 'Montent' },
];

const PALETTES: Record<string, string[]> = {
  kawaii: ['#FFB7C5', '#B5EAEA', '#E8D5FF', '#FFEAA7', '#C4FAF8', '#FFD3E0', '#D5AAFF', '#A8E6CF'],
  aero: ['#00B4D8', '#0096C7', '#48CAE4', '#90E0EF', '#ADE8F4', '#52B788', '#74C69D', '#95D5B2'],
  'retro-ps1': ['#00FF00', '#00CC00', '#33FF33', '#66FF66', '#00FFCC'],
  neon: ['#ff4fd8', '#3fd0ff', '#b6ff3f', '#ffe14f', '#ff7a3f'],
  default: ['#FFFFFF', '#00FFFF', '#FF00FF', '#FFFF00', '#00FF00', '#FF6600'],
};

export const decoActive = (d: DecoState | undefined) => !!d && d.shapes.length > 0;
export const decoAnimated = (d: DecoState | undefined) => decoActive(d) && d!.motion !== 'static';

function colorsFor(d: DecoState, t: DrawTarget): string[] {
  if (d.palette === 'white') return ['#ffffff'];
  if (d.palette === 'slice') return [t.color];
  if (d.palette === 'rainbow') return Array.from({ length: 8 }, (_, i) => `hsl(${i * 45},95%,65%)`);
  return PALETTES[t.theme.id] || PALETTES.default;
}

// ─── Layout cache (the hot path runs every frame) ────────────

interface Elem { kind: string; x: number; y: number; s: number; color: string; off: number; k: number }
const layouts = new Map<string, Elem[]>();

function layoutFor(t: DrawTarget, d: DecoState): Elem[] {
  const key = `${d.shapes.join(',')}|${d.density}|${d.size}|${d.palette}|${d.seed}|${d.cycles}|${t.index}|${Math.round(t.w)}x${Math.round(t.h)}|${t.theme.id}|${t.color}`;
  let l = layouts.get(key);
  if (l) return l;
  if (layouts.size > 600) layouts.clear();
  const colors = colorsFor(d, t);
  const base = Math.min(t.w, t.h) * 0.025 * (d.size / 100);
  const count = Math.max(1, Math.round(d.density * 4));
  const r = rng(d.seed * 7919 + t.index * 104729 + Math.round(t.w) * 13 + Math.round(t.h) * 31);
  const cyc = Math.max(1, Math.round(d.cycles));
  l = [];
  for (const kind of d.shapes) {
    for (let i = 0; i < count; i++) {
      const x = r() * t.w, y = r() * t.h;
      const color = colors[Math.floor(r() * colors.length)];
      const s = base * (0.5 + r());
      const off = r();
      // Whole-number frequencies only → every motion loops seamlessly
      l.push({ kind, x, y, s, color, off, k: cyc * (1 + Math.floor(r() * 2)) });
    }
  }
  layouts.set(key, l);
  return l;
}

export function drawDeco(ctx: CanvasRenderingContext2D, t: DrawTarget, d: DecoState, time: LoopTime | null) {
  if (!decoActive(d)) return;
  const elems = layoutFor(t, d);
  const ph = time ? time.phase : 0;
  const cyc = Math.max(1, Math.round(d.cycles));
  const B = ctx.getTransform();
  const px = Math.max(1e-3, Math.hypot(B.a, B.b)); // device px per local unit
  const baseAlpha = ctx.globalAlpha;
  let lastColor = '';
  for (const e of elems) {
    let x = e.x, y = e.y, scale = 1, rot = 0, alpha = d.opacity / 100;
    const a = TAU * (ph * e.k + e.off);
    switch (d.motion) {
      case 'float':
        y += Math.sin(a) * e.s * 0.6;
        x += Math.cos(a) * e.s * 0.3;
        rot = Math.sin(a) * 0.15;
        scale = 1 + Math.sin(a) * 0.1;
        break;
      case 'twinkle': {
        const w = 0.5 + 0.5 * Math.sin(a);
        scale = 0.6 + 0.4 * w;
        alpha *= 0.35 + 0.65 * w;
        break;
      }
      case 'spin':
        rot = TAU * ph * e.k * (e.off > 0.5 ? 1 : -1);
        break;
      case 'rise': {
        const p = (ph * cyc + e.off) % 1;
        y = t.h + e.s - p * (t.h + e.s * 2);
        x += Math.sin(TAU * (p + e.off)) * e.s;
        rot = Math.sin(TAU * p) * 0.3;
        break;
      }
    }
    const sc = scale * e.s;
    if (e.kind === 'arrows') rot += e.off * TAU;
    const cs = Math.cos(rot) * sc, sn = Math.sin(rot) * sc;
    // M = B · T(x,y) · R(rot) · S(scale), set without save/restore or matrix objects
    ctx.setTransform(
      B.a * cs + B.c * sn, B.b * cs + B.d * sn,
      -B.a * sn + B.c * cs, -B.b * sn + B.d * cs,
      B.a * x + B.c * y + B.e, B.b * x + B.d * y + B.f,
    );
    ctx.globalAlpha = baseAlpha * Math.max(0, Math.min(1, alpha));
    if (e.color !== lastColor) { ctx.fillStyle = ctx.strokeStyle = e.color; lastColor = e.color; }
    const up = unitPath(e.kind);
    ctx.fill(up.fill);
    if (up.stroke) { ctx.lineWidth = Math.max(1 / (px * e.s), 0.1); ctx.stroke(up.stroke); }
    if (up.accent) { ctx.fillStyle = up.accentColor!; ctx.fill(up.accent); ctx.fillStyle = e.color; }
  }
  ctx.setTransform(B);
  ctx.globalAlpha = baseAlpha;
}

// Unit-size Path2D per shape: built once, filled thousands of times per frame
interface UnitPath { fill: Path2D; stroke?: Path2D; accent?: Path2D; accentColor?: string }
const unitPaths = new Map<string, UnitPath>();
function unitPath(kind: string): UnitPath {
  let u = unitPaths.get(kind);
  if (u) return u;
  const f = new Path2D();
  const star = (points: number, inner: number) => {
    for (let i = 0; i < points * 2; i++) {
      const ang = (Math.PI * i) / points - Math.PI / 2;
      const rr = i % 2 === 0 ? 1 : inner;
      i ? f.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr) : f.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    f.closePath();
  };
  u = { fill: f };
  switch (kind) {
    case 'stars': star(4, 0.35); break;
    case 'sparkles': star(6, 0.2); f.moveTo(0.15, 0); f.arc(0, 0, 0.15, 0, TAU); break;
    case 'hearts':
      f.moveTo(0, 0.36); f.bezierCurveTo(-0.6, -0.12, -0.3, -0.6, 0, -0.24); f.bezierCurveTo(0.3, -0.6, 0.6, -0.12, 0, 0.36); f.closePath();
      break;
    case 'music-notes': {
      f.ellipse(0, 0.15, 0.175, 0.125, -0.3, 0, TAU);
      const st = new Path2D();
      st.moveTo(0.15, 0.1); st.lineTo(0.15, -0.4); st.quadraticCurveTo(0.4, -0.2, 0.15, -0.05);
      u.stroke = st;
      break;
    }
    case 'flowers': {
      for (let i = 0; i < 5; i++) { const a = (TAU * i) / 5; f.moveTo(Math.cos(a) * 0.25 + 0.2, Math.sin(a) * 0.25); f.arc(Math.cos(a) * 0.25, Math.sin(a) * 0.25, 0.2, 0, TAU); }
      const c = new Path2D(); c.arc(0, 0, 0.15, 0, TAU);
      u.accent = c; u.accentColor = '#fff8d0';
      break;
    }
    case 'diamonds': f.moveTo(0, -0.7); f.lineTo(0.42, 0); f.lineTo(0, 0.7); f.lineTo(-0.42, 0); f.closePath(); break;
    case 'clouds':
      for (const [cx, cy, r] of [[-0.18, 0, 0.21], [0.18, 0, 0.21], [0, -0.12, 0.27], [0, 0.06, 0.18]]) { f.moveTo(cx + r, cy); f.arc(cx, cy, r, 0, TAU); }
      break;
    case 'pixels': {
      const cell = 0.8 / 3;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if ((r + c) % 2 === 0) f.rect(-0.4 + c * cell, -0.4 + r * cell, cell * 0.9, cell * 0.9);
      break;
    }
    case 'circles': {
      f.arc(0, 0, 0.3, 0, TAU);
      const st = new Path2D(); st.arc(0, 0, 0.6, 0, TAU); u.stroke = st;
      break;
    }
    case 'crosses': f.rect(-0.105, -0.7, 0.21, 1.4); f.rect(-0.7, -0.105, 1.4, 0.21); break;
    case 'arrows':
      f.moveTo(0, -0.7); f.lineTo(0.35, -0.21); f.lineTo(0.105, -0.21); f.lineTo(0.105, 0.7);
      f.lineTo(-0.105, 0.7); f.lineTo(-0.105, -0.21); f.lineTo(-0.35, -0.21); f.closePath();
      break;
    case 'lightning':
      f.moveTo(0.07, -0.7); f.lineTo(-0.14, -0.035); f.lineTo(0.035, -0.035); f.lineTo(-0.105, 0.7); f.lineTo(0.175, 0.035); f.lineTo(-0.014, 0.035); f.closePath();
      break;
  }
  unitPaths.set(kind, u);
  return u;
}

// ─── Shapes (centred on 0,0) ────────────────────────────────────

function poly(ctx: CanvasRenderingContext2D, points: number, outer: number, inner: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const ang = (Math.PI * i) / points - Math.PI / 2;
    const rr = i % 2 === 0 ? outer : inner;
    const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawShape(ctx: CanvasRenderingContext2D, kind: string, s: number, color: string, variant = 0) {
  switch (kind) {
    case 'stars': poly(ctx, 4, s, s * 0.35); break;
    case 'sparkles':
      poly(ctx, 6, s, s * 0.2);
      ctx.beginPath(); ctx.arc(0, 0, s * 0.15, 0, TAU); ctx.fill();
      break;
    case 'hearts': {
      const h = s * 0.6;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.6);
      ctx.bezierCurveTo(-h, -h * 0.2, -h * 0.5, -h, 0, -h * 0.4);
      ctx.bezierCurveTo(h * 0.5, -h, h, -h * 0.2, 0, h * 0.6);
      ctx.closePath(); ctx.fill();
      break;
    }
    case 'music-notes': {
      const h = s * 0.5;
      ctx.beginPath(); ctx.ellipse(0, h * 0.3, h * 0.35, h * 0.25, -0.3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(h * 0.3, h * 0.2); ctx.lineTo(h * 0.3, -h * 0.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(h * 0.3, -h * 0.8); ctx.quadraticCurveTo(h * 0.8, -h * 0.4, h * 0.3, -h * 0.1); ctx.stroke();
      break;
    }
    case 'flowers': {
      const pr = s * 0.5;
      for (let i = 0; i < 5; i++) {
        const ang = (TAU * i) / 5;
        ctx.beginPath(); ctx.arc(Math.cos(ang) * pr * 0.5, Math.sin(ang) * pr * 0.5, pr * 0.4, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#fff8d0';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.15, 0, TAU); ctx.fill();
      ctx.fillStyle = color;
      break;
    }
    case 'diamonds': {
      const h = s * 0.7;
      ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(h * 0.6, 0); ctx.lineTo(0, h); ctx.lineTo(-h * 0.6, 0); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalAlpha *= 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath(); ctx.moveTo(-h * 0.4, -h * 0.15); ctx.lineTo(h * 0.4, -h * 0.15); ctx.stroke(); ctx.restore();
      break;
    }
    case 'clouds': {
      const h = s * 0.6;
      ctx.beginPath();
      ctx.arc(-h * 0.3, 0, h * 0.35, 0, TAU);
      ctx.arc(h * 0.3, 0, h * 0.35, 0, TAU);
      ctx.arc(0, -h * 0.2, h * 0.45, 0, TAU);
      ctx.arc(0, h * 0.1, h * 0.3, 0, TAU);
      ctx.fill();
      break;
    }
    case 'pixels': {
      const h = s * 0.4, cell = (h * 2) / 3;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        if ((r + c) % 2 === 0) ctx.fillRect(-h + c * cell, -h + r * cell, cell * 0.9, cell * 0.9);
      }
      break;
    }
    case 'circles':
      ctx.beginPath(); ctx.arc(0, 0, s * 0.6, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, TAU); ctx.fill();
      break;
    case 'crosses': {
      const h = s * 0.7, w = h * 0.3;
      ctx.fillRect(-w / 2, -h, w, h * 2); ctx.fillRect(-h, -w / 2, h * 2, w);
      break;
    }
    case 'arrows': {
      const h = s * 0.7;
      ctx.rotate(variant * TAU);
      ctx.beginPath();
      ctx.moveTo(0, -h); ctx.lineTo(h * 0.5, -h * 0.3); ctx.lineTo(h * 0.15, -h * 0.3); ctx.lineTo(h * 0.15, h);
      ctx.lineTo(-h * 0.15, h); ctx.lineTo(-h * 0.15, -h * 0.3); ctx.lineTo(-h * 0.5, -h * 0.3);
      ctx.closePath(); ctx.fill();
      break;
    }
    case 'lightning': {
      const h = s * 0.7;
      ctx.beginPath();
      ctx.moveTo(h * 0.1, -h); ctx.lineTo(-h * 0.2, -h * 0.05); ctx.lineTo(h * 0.05, -h * 0.05);
      ctx.lineTo(-h * 0.15, h); ctx.lineTo(h * 0.25, h * 0.05); ctx.lineTo(-h * 0.02, h * 0.05);
      ctx.closePath(); ctx.fill();
      break;
    }
  }
}
