import { DrawTarget, Params } from '../core/types';

export const P = {
  n: (p: Params, k: string, fb = 0) => (typeof p[k] === 'number' ? (p[k] as number) : Number(p[k] ?? fb) || fb),
  s: (p: Params, k: string, fb = '') => (p[k] === undefined ? fb : String(p[k])),
  b: (p: Params, k: string) => p[k] === true || p[k] === 'true',
};

/** Font size that scales with the target but stays readable. */
export function autoFont(t: DrawTarget, frac: number, min = 9, max = 400) {
  return Math.max(min, Math.min(max, Math.min(t.w, t.h) * frac));
}

export function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number, y: number,
  size: number,
  opts: { color?: string; font?: string; weight?: number; align?: CanvasTextAlign; base?: CanvasTextBaseline; outline?: string | null; maxW?: number } = {},
) {
  ctx.font = `${opts.weight ?? 600} ${size}px ${opts.font ?? 'sans-serif'}`;
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = opts.base ?? 'middle';
  if (opts.outline !== null) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.16);
    ctx.strokeStyle = opts.outline ?? 'rgba(0,0,0,0.85)';
    ctx.strokeText(str, x, y, opts.maxW);
  }
  ctx.fillStyle = opts.color ?? '#fff';
  ctx.fillText(str, x, y, opts.maxW);
}

/** Text label on a solid pill — always legible whatever is under it. */
export function pill(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number, y: number,
  size: number,
  opts: { bg?: string; fg?: string; font?: string; align?: 'left' | 'center' | 'right'; vAlign?: 'top' | 'middle' | 'bottom'; accent?: string } = {},
) {
  if (!lines.length) return;
  ctx.font = `600 ${size}px ${opts.font ?? 'sans-serif'}`;
  const lh = size * 1.25;
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + size * 1.1;
  const h = lines.length * lh + size * 0.6;
  let bx = x, by = y;
  if (opts.align === 'center' || !opts.align) bx -= w / 2;
  if (opts.align === 'right') bx -= w;
  if (opts.vAlign === 'middle' || !opts.vAlign) by -= h / 2;
  if (opts.vAlign === 'bottom') by -= h;
  ctx.fillStyle = opts.bg ?? 'rgba(10,11,14,0.82)';
  roundRect(ctx, bx, by, w, h, size * 0.35);
  ctx.fill();
  if (opts.accent) {
    ctx.fillStyle = opts.accent;
    ctx.fillRect(bx, by + size * 0.3, Math.max(2, size * 0.18), h - size * 0.6);
  }
  ctx.fillStyle = opts.fg ?? '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => {
    ctx.font = `${i === 0 ? 700 : 500} ${size}px ${opts.font ?? 'sans-serif'}`;
    ctx.fillText(l, bx + size * 0.6, by + size * 0.3 + lh * (i + 0.5));
  });
  return { x: bx, y: by, w, h };
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 1-pixel crisp line in composition pixels. */
export function hline(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, lw = 1) {
  ctx.fillRect(x0, y - lw / 2, x1 - x0, lw);
}
export function vline(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, lw = 1) {
  ctx.fillRect(x - lw / 2, y0, lw, y1 - y0);
}

export function circle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(0.1, r), 0, Math.PI * 2);
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Line width that stays at least one screen pixel in a scaled preview. */
export const lw = (t: DrawTarget, px: number) => Math.max(px, 1 / Math.max(t.px, 1e-3) * 0.9);

// ─── Pixel-buffer cache (zone plate, noise…) ────────────────────

const pixelCache = new Map<string, HTMLCanvasElement>();
export function cachedPixels(key: string, w: number, h: number, fill: (d: Uint8ClampedArray, w: number, h: number) => void) {
  const k = `${key}|${w}x${h}`;
  let c = pixelCache.get(k);
  if (c) return c;
  if (pixelCache.size > 24) pixelCache.clear();
  c = document.createElement('canvas');
  c.width = Math.max(1, w); c.height = Math.max(1, h);
  const x = c.getContext('2d')!;
  const img = x.createImageData(c.width, c.height);
  fill(img.data, c.width, c.height);
  x.putImageData(img, 0, 0);
  pixelCache.set(k, c);
  return c;
}

export const CYCLE = (phase: number, cycles: number) => (phase * Math.max(1, Math.round(cycles))) % 1;
export const TAU = Math.PI * 2;
