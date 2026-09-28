import { Frame, Lattice, Pt, Rect } from './types';

export const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

export function bboxOf(pts: Pt[]): Rect {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }
  if (!isFinite(x0)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Local frame of a TL,TR,BR,BL quad. Snaps near-axis angles so ordinary
 *  slices stay pixel-aligned. */
export function frameOf(q: Pt[]): Frame {
  const [a, b, , d] = q;
  let angle = Math.atan2(b.y - a.y, b.x - a.x);
  if (Math.abs(angle) < 1e-4) angle = 0;
  if (angle === 0) {
    const bb = bboxOf(q);
    return { x: bb.x, y: bb.y, w: bb.w, h: bb.h, angle: 0 };
  }
  return { x: a.x, y: a.y, w: dist(a, b), h: dist(a, d), angle };
}

export function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Bilinear point inside a TL,TR,BR,BL quad. */
export function quadPoint(q: Pt[], u: number, v: number): Pt {
  const top = lerpPt(q[0], q[1], u);
  const bot = lerpPt(q[3], q[2], u);
  return lerpPt(top, bot, v);
}

/** Bilinear sample of a control lattice (row-major, rows × cols). */
export function latticePoint(l: Lattice, u: number, v: number): Pt {
  const fx = Math.min(Math.max(u, 0), 1) * (l.cols - 1);
  const fy = Math.min(Math.max(v, 0), 1) * (l.rows - 1);
  const i = Math.min(Math.floor(fx), l.cols - 2);
  const j = Math.min(Math.floor(fy), l.rows - 2);
  const tu = fx - i, tv = fy - j;
  const p = (c: number, r: number) => l.pts[r * l.cols + c];
  return quadPoint([p(i, j), p(i + 1, j), p(i + 1, j + 1), p(i, j + 1)], tu, tv);
}

// ─── Homography ─────────────────────────────────────────────────

export type Mat3 = number[]; // 9 values, row-major

/** Solve the 3×3 homography mapping src[i] → dst[i] (4 points). */
export function homography(src: Pt[], dst: Pt[]): Mat3 | null {
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: X, y: Y } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y, X]);
    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y, Y]);
  }
  // Gaussian elimination on the 8×9 augmented matrix
  for (let c = 0; c < 8; c++) {
    let piv = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    if (Math.abs(A[piv][c]) < 1e-12) return null;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
    }
  }
  const h = A.map((row, i) => row[8] / row[i]);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

export function applyH(m: Mat3, p: Pt): Pt {
  const w = m[6] * p.x + m[7] * p.y + m[8];
  return { x: (m[0] * p.x + m[1] * p.y + m[2]) / w, y: (m[3] * p.x + m[4] * p.y + m[5]) / w };
}

export function isIdentityish(src: Pt[], dst: Pt[]) {
  return src.every((p, i) => Math.abs(p.x - dst[i].x) < 0.01 && Math.abs(p.y - dst[i].y) < 0.01);
}

// ─── Textured triangles (affine mapping) ────────────────────────

/** Draw the source triangle (s0,s1,s2) of img onto destination (d0,d1,d2).
 *  The destination is grown by `bleed` px to hide seams between triangles. */
export function drawTriangle(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  s0: Pt, s1: Pt, s2: Pt,
  d0: Pt, d1: Pt, d2: Pt,
  bleed = 0.6,
) {
  const cx = (d0.x + d1.x + d2.x) / 3, cy = (d0.y + d1.y + d2.y) / 3;
  const grow = (p: Pt) => {
    const dx = p.x - cx, dy = p.y - cy;
    const l = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / l) * bleed, y: p.y + (dy / l) * bleed };
  };
  const g0 = grow(d0), g1 = grow(d1), g2 = grow(d2);

  const den = (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y);
  if (Math.abs(den) < 1e-9) return;
  // Affine matrix M so that M·s = d
  const a = ((d1.x - d0.x) * (s2.y - s0.y) - (d2.x - d0.x) * (s1.y - s0.y)) / den;
  const b = ((d1.y - d0.y) * (s2.y - s0.y) - (d2.y - d0.y) * (s1.y - s0.y)) / den;
  const c = ((d2.x - d0.x) * (s1.x - s0.x) - (d1.x - d0.x) * (s2.x - s0.x)) / den;
  const d = ((d2.y - d0.y) * (s1.x - s0.x) - (d1.y - d0.y) * (s2.x - s0.x)) / den;
  const e = d0.x - a * s0.x - c * s0.y;
  const f = d0.y - b * s0.x - d * s0.y;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(g0.x, g0.y);
  ctx.lineTo(g1.x, g1.y);
  ctx.lineTo(g2.x, g2.y);
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([a, b, c, d, e, f])));
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

export function polygonPath(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

/** Area of intersection of two axis-aligned rects (null if none). */
export function intersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 - x < 0.5 || y2 - y < 0.5) return null;
  return { x, y, w: x2 - x, h: y2 - y };
}

export function gcd(a: number, b: number): number {
  a = Math.round(Math.abs(a)); b = Math.round(Math.abs(b));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/** "16:9", "5:4", or a decimal ratio when the fraction is ugly. */
export function ratioLabel(w: number, h: number): string {
  const g = gcd(w, h);
  const a = Math.round(w / g), b = Math.round(h / g);
  if (a <= 32 && b <= 32) return `${a}:${b}`;
  return `${(w / h).toFixed(3)}:1`;
}
