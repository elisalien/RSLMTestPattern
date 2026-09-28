import { Anchor, DrawTarget, LogoLayer, LoopTime } from '../core/types';
import { assets } from '../state/assets';
import { TAU, rng, roundRect } from './draw';

export const NEW_LOGO = (n: number, assetId: string | null = null): LogoLayer => ({
  id: `logo-${Date.now().toString(36)}-${n}`,
  name: `Logo ${n}`,
  enabled: true,
  assetId,
  target: 'each',
  sliceIds: [],
  anchor: 'tr',
  offsetX: 0,
  offsetY: 0,
  margin: 3,
  size: 14,
  sizeRef: 'min',
  opacity: 100,
  rotation: 0,
  flipX: false,
  blend: 'source-over',
  colorMode: 'original',
  tint: '#ffffff',
  shadow: false,
  shadowBlur: 8,
  shadowOpacity: 60,
  plate: false,
  plateColor: '#000000',
  plateOpacity: 60,
  platePadding: 18,
  plateRadius: 30,
  tile: false,
  tileGap: 80,
  tileAngle: -20,
  tileStagger: true,
  anim: 'none',
  animCycles: 1,
  animAmount: 50,
});

export const ANCHORS: { id: Anchor; label: string }[] = [
  { id: 'tl', label: 'Haut gauche' }, { id: 'tc', label: 'Haut centre' }, { id: 'tr', label: 'Haut droite' },
  { id: 'cl', label: 'Milieu gauche' }, { id: 'c', label: 'Centre' }, { id: 'cr', label: 'Milieu droite' },
  { id: 'bl', label: 'Bas gauche' }, { id: 'bc', label: 'Bas centre' }, { id: 'br', label: 'Bas droite' },
];

// ─── Colour processing (cached) ─────────────────────────────────

const processed = new Map<string, HTMLCanvasElement>();

function sourceFor(layer: LogoLayer, sliceColor: string): { src: CanvasImageSource; w: number; h: number } | null {
  const a = assets.get(layer.assetId);
  if (!a) return null;
  const mode = layer.colorMode;
  if (mode === 'original') return { src: a.img, w: a.w, h: a.h };
  const tint = mode === 'tint' ? layer.tint : mode === 'white' ? '#ffffff' : mode === 'black' ? '#000000' : mode === 'slice' ? sliceColor : '';
  const key = `${a.id}|${mode}|${tint}`;
  let c = processed.get(key);
  if (!c) {
    if (processed.size > 64) processed.clear();
    const s = Math.min(1, 2048 / Math.max(a.w, a.h));
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(a.w * s)); c.height = Math.max(1, Math.round(a.h * s));
    const x = c.getContext('2d')!;
    x.drawImage(a.img, 0, 0, c.width, c.height);
    if (mode === 'invert') {
      const d = x.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < d.data.length; i += 4) { d.data[i] = 255 - d.data[i]; d.data[i + 1] = 255 - d.data[i + 1]; d.data[i + 2] = 255 - d.data[i + 2]; }
      x.putImageData(d, 0, 0);
    } else {
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = tint;
      x.fillRect(0, 0, c.width, c.height);
    }
    processed.set(key, c);
  }
  return { src: c, w: a.w, h: a.h };
}

const tri = (x: number) => 1 - Math.abs(((x % 1) + 1) % 1 * 2 - 1);

// ─── Draw one logo layer into one target ────────────────────────

export function drawLogo(ctx: CanvasRenderingContext2D, layer: LogoLayer, t: DrawTarget, time: LoopTime | null) {
  const s = sourceFor(layer, t.color);
  if (!s) return;
  const m = Math.min(t.w, t.h);
  const ar = s.w / s.h;
  let lw: number, lh: number;
  if (layer.sizeRef === 'width') { lw = t.w * layer.size / 100; lh = lw / ar; }
  else if (layer.sizeRef === 'height') { lh = t.h * layer.size / 100; lw = lh * ar; }
  else { const big = m * layer.size / 100; if (ar >= 1) { lw = big; lh = big / ar; } else { lh = big; lw = big * ar; } }
  if (lw < 0.5 || lh < 0.5) return;

  const phase = time ? time.phase : 0;
  const cyc = Math.max(1, Math.round(layer.animCycles));
  const amt = layer.animAmount / 100;
  const ph = (phase * cyc) % 1;

  ctx.save();
  ctx.globalCompositeOperation = layer.blend;
  let alpha = layer.opacity / 100;

  if (layer.tile) {
    drawTiled(ctx, layer, t, s, lw, lh, ph, amt, alpha);
    ctx.restore();
    return;
  }

  // Anchor position
  const mg = m * layer.margin / 100;
  const ax = layer.anchor[1] === 'l' || layer.anchor === 'cl' ? 'l' : layer.anchor[1] === 'r' || layer.anchor === 'cr' ? 'r' : 'c';
  const ay = layer.anchor[0];
  const pad = layer.plate ? lh * layer.platePadding / 100 : 0;
  let x = ax === 'l' ? mg + pad + lw / 2 : ax === 'r' ? t.w - mg - pad - lw / 2 : t.w / 2;
  let y = ay === 't' ? mg + pad + lh / 2 : ay === 'b' ? t.h - mg - pad - lh / 2 : t.h / 2;
  x += t.w * layer.offsetX / 100;
  y += t.h * layer.offsetY / 100;

  let sx = layer.flipX ? -1 : 1, sy = 1, rot = (layer.rotation * Math.PI) / 180;
  switch (layer.anim) {
    case 'pulse': { const k = 1 + 0.3 * amt * Math.sin(ph * TAU); sx *= k; sy *= k; break; }
    case 'rotate': rot += ph * TAU; break;
    case 'bounce': y -= Math.abs(Math.sin(ph * Math.PI)) * m * 0.15 * amt; break;
    case 'float': x += Math.sin(ph * TAU) * m * 0.03 * amt; y += Math.sin(ph * TAU * 2) * m * 0.02 * amt; rot += Math.sin(ph * TAU) * 0.08 * amt; break;
    case 'fade': alpha *= 1 - amt * (0.5 - 0.5 * Math.cos(ph * TAU)); break;
    case 'flip': sx *= Math.cos(ph * TAU); break;
    case 'orbit': x += Math.cos(ph * TAU) * m * 0.12 * amt; y += Math.sin(ph * TAU) * m * 0.12 * amt; break;
    case 'dvd': {
      // Whole-number bounces on each axis → seamless loop
      x = pad + lw / 2 + tri(phase * cyc * 3) * (t.w - lw - pad * 2);
      y = pad + lh / 2 + tri(phase * cyc * 2 + 0.25) * (t.h - lh - pad * 2);
      break;
    }
    case 'glitch': {
      if (time) {
        const r = rng(time.frame * 7919 + 13);
        if (r() < 0.25 * (0.3 + amt)) { x += (r() - 0.5) * lw * 0.3 * amt; y += (r() - 0.5) * lh * 0.1; alpha *= 0.6 + r() * 0.4; }
      }
      break;
    }
  }

  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  if (layer.plate) {
    ctx.save();
    ctx.globalAlpha *= layer.plateOpacity / 100;
    ctx.fillStyle = layer.plateColor;
    const pw = lw + pad * 2, ph2 = lh + pad * 2;
    roundRect(ctx, -pw / 2, -ph2 / 2, pw, ph2, ph2 * layer.plateRadius / 100);
    ctx.fill();
    ctx.restore();
  }
  if (layer.shadow) {
    ctx.shadowColor = `rgba(0,0,0,${layer.shadowOpacity / 100})`;
    ctx.shadowBlur = lh * layer.shadowBlur / 100 * t.px;
    ctx.shadowOffsetY = lh * 0.03 * t.px;
  }
  if (layer.anim === 'glitch' && time && rng(time.frame * 31 + 7)() < 0.2 * (0.3 + amt)) {
    // RGB split
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= 0.7;
    ctx.drawImage(s.src, -lw / 2 - lw * 0.02, -lh / 2, lw, lh);
    ctx.drawImage(s.src, -lw / 2 + lw * 0.02, -lh / 2, lw, lh);
  } else {
    ctx.drawImage(s.src, -lw / 2, -lh / 2, lw, lh);
  }
  ctx.restore();
}

function drawTiled(
  ctx: CanvasRenderingContext2D, layer: LogoLayer, t: DrawTarget,
  s: { src: CanvasImageSource }, lw: number, lh: number, ph: number, amt: number, alpha: number,
) {
  const gap = Math.max(lw, lh) * layer.tileGap / 100;
  const sx = lw + gap, sy = lh + gap;
  const diag = Math.hypot(t.w, t.h);
  ctx.globalAlpha = alpha;
  ctx.translate(t.w / 2, t.h / 2);
  ctx.rotate((layer.tileAngle * Math.PI) / 180);
  // Scrolling tile animations move by exactly one tile per cycle → seamless
  let ox = 0, oy = 0;
  if (layer.anim === 'dvd' || layer.anim === 'float' || layer.anim === 'orbit') ox = ph * sx;
  if (layer.anim === 'bounce') oy = ph * sy * (layer.tileStagger ? 2 : 1);
  const n = Math.ceil(diag / Math.min(sx, sy)) + 2;
  for (let j = -n; j <= n; j++) {
    const stag = layer.tileStagger && j % 2 ? sx / 2 : 0;
    for (let i = -n; i <= n; i++) {
      const x = i * sx + stag + ox;
      const y = j * sy + oy;
      if (Math.abs(x) > diag / 2 + sx || Math.abs(y) > diag / 2 + sy) continue;
      ctx.save();
      ctx.translate(x, y);
      if (layer.anim === 'pulse') { const k = 1 + 0.3 * amt * Math.sin(ph * TAU + (i + j) * 0.6); ctx.scale(k, k); }
      if (layer.anim === 'rotate') ctx.rotate(ph * TAU);
      if (layer.anim === 'fade') ctx.globalAlpha = alpha * (1 - amt * (0.5 - 0.5 * Math.cos(ph * TAU + (i - j) * 0.5)));
      if (layer.flipX) ctx.scale(-1, 1);
      ctx.drawImage(s.src, -lw / 2, -lh / 2, lw, lh);
      ctx.restore();
    }
  }
}

export const isLogoAnimated = (l: LogoLayer) => l.enabled && l.anim !== 'none';
