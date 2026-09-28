import { Rect, Theme } from '../core/types';

const SANS = '"Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif';
const MONO = '"Cascadia Mono", "Consolas", "SF Mono", monospace';

let scanlines: CanvasPattern | null = null;
function scanlinePattern(ctx: CanvasRenderingContext2D) {
  if (scanlines) return scanlines;
  const c = document.createElement('canvas');
  c.width = 1; c.height = 3;
  const x = c.getContext('2d')!;
  x.fillStyle = 'rgba(0,0,0,0.22)';
  x.fillRect(0, 0, 1, 1);
  scanlines = ctx.createPattern(c, 'repeat');
  return scanlines!;
}

export const THEMES: Theme[] = [
  {
    id: 'studio', name: 'Studio', desc: 'Neutre, lisible, couleurs franches par slice',
    bg: '#0b0c10', fg: '#f2f0ea', dim: '#8a8f9c', accent: '#3fd0c9',
    font: SANS, mono: MONO, hues: [330, 180, 120, 25, 250, 55, 290, 200, 150, 5], sat: 85, light: 56,
  },
  {
    id: 'broadcast', name: 'Broadcast', desc: 'Mire télé classique, gris et blanc',
    bg: '#000000', fg: '#ffffff', dim: '#9a9a9a', accent: '#ffd400',
    font: SANS, mono: MONO, hues: [0, 120, 240, 60, 180, 300, 30, 210, 90, 270], sat: 70, light: 50,
  },
  {
    id: 'neon', name: 'Néon', desc: 'Traits lumineux sur fond nuit',
    bg: '#07030f', fg: '#fdf6ff', dim: '#8f7aa8', accent: '#ff4fd8',
    font: SANS, mono: MONO, hues: [300, 190, 90, 20, 260, 160, 330, 50], sat: 100, light: 60,
    post: (ctx, r) => {
      const g = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h / 2, 0, r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) * 0.7);
      g.addColorStop(0, 'rgba(255,79,216,0.06)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    },
  },
  {
    id: 'retro-ps1', name: 'Retro PS1', desc: 'Scanlines CRT et vignette',
    bg: '#050505', fg: '#e6e6e6', dim: '#7c7c7c', accent: '#00c8c8',
    font: MONO, mono: MONO, hues: [180, 300, 60, 0, 120, 240], sat: 55, light: 45,
    bars: ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'],
    post: (ctx, r: Rect) => {
      ctx.fillStyle = scanlinePattern(ctx);
      ctx.fillRect(r.x, r.y, r.w, r.h);
      const v = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.3, r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = v;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    },
  },
  {
    id: 'kawaii', name: 'Kawaii Core', desc: 'Pastels doux façon Needy Streamer',
    bg: '#1b1026', fg: '#fff4fb', dim: '#c9a8d8', accent: '#ffb7c5',
    font: SANS, mono: MONO, hues: [340, 180, 270, 45, 160, 310, 200], sat: 90, light: 78,
    bars: ['#ffd3e0', '#ffeaa7', '#b5eaea', '#a8e6cf', '#e8d5ff', '#ffb7c5', '#c4d7ff'],
    post: (ctx, r) => {
      const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
      g.addColorStop(0, 'rgba(255,183,197,0.07)');
      g.addColorStop(1, 'rgba(181,234,234,0.07)');
      ctx.fillStyle = g;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    },
  },
  {
    id: 'aero', name: 'Frutiger Aero', desc: 'Dégradés brillants ciel et verdure',
    bg: '#07162b', fg: '#f0fbff', dim: '#8fb8cc', accent: '#48cae4',
    font: SANS, mono: MONO, hues: [195, 150, 210, 120, 180, 90], sat: 80, light: 58,
    bars: ['#caf0f8', '#90e0ef', '#48cae4', '#52b788', '#74c69d', '#0096c7', '#023e8a'],
    post: (ctx, r) => {
      const g = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h * 0.45);
      g.addColorStop(0, 'rgba(255,255,255,0.12)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(r.x, r.y, r.w, r.h * 0.45);
    },
  },
];

export const themeById = (id: string) => THEMES.find(t => t.id === id) || THEMES[0];

export function sliceHsl(theme: Theme, i: number, lightOffset = 0) {
  const hue = theme.hues[i % theme.hues.length] + Math.floor(i / theme.hues.length) * 17;
  return `hsl(${hue % 360}, ${theme.sat}%, ${Math.max(5, Math.min(95, theme.light + lightOffset))}%)`;
}
