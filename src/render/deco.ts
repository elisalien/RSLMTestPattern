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

export function drawDeco(ctx: CanvasRenderingContext2D, t: DrawTarget, d: DecoState, time: LoopTime | null) {
  if (!decoActive(d)) return;
  const colors = colorsFor(d, t);
  const base = Math.min(t.w, t.h) * 0.025 * (d.size / 100);
  const count = Math.max(1, Math.round(d.density * 4));
  const r = rng(d.seed * 7919 + t.index * 104729 + Math.round(t.w) * 13 + Math.round(t.h) * 31);
  const ph = time ? time.phase : 0;
  const cyc = Math.max(1, Math.round(d.cycles));
  ctx.save();
  for (const kind of d.shapes) {
    for (let i = 0; i < count; i++) {
      let x = r() * t.w, y = r() * t.h;
      const color = colors[Math.floor(r() * colors.length)];
      const s = base * (0.5 + r());
      const off = r();
      // Whole-number frequencies only → every motion loops seamlessly
      const k = cyc * (1 + Math.floor(r() * 2));
      const a = TAU * (ph * k + off);
      let scale = 1, rot = 0, alpha = d.opacity / 100;
      switch (d.motion) {
        case 'float':
          y += Math.sin(a) * s * 0.6;
          x += Math.cos(a) * s * 0.3;
          rot = Math.sin(a) * 0.15;
          scale = 1 + Math.sin(a) * 0.1;
          break;
        case 'twinkle':
          scale = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(a));
          alpha *= 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(a));
          break;
        case 'spin':
          rot = TAU * ph * k * (off > 0.5 ? 1 : -1);
          break;
        case 'rise': {
          const p = (ph * cyc + off) % 1;
          y = t.h + s - p * (t.h + s * 2);
          x += Math.sin(TAU * (p + off)) * s;
          rot = Math.sin(TAU * p) * 0.3;
          break;
        }
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, s * 0.1);
      ctx.translate(x, y);
      if (rot) ctx.rotate(rot);
      if (scale !== 1) ctx.scale(scale, scale);
      drawShape(ctx, kind, s, color, off);
      ctx.restore();
    }
  }
  ctx.restore();
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
