import { TemplateType, GraphicPresetType, SliceData, OverlaySource, SliceOverlays, LogoSettings, LogoInstance, DecorativeSettings, AnimationPresetType, VideoPresetType } from '../types';
import type { DecorativeElementType } from '../types';

// ─── SMPTE Color Constants ──────────────────────────────────────

const SMPTE_75 = ['#BFBFBF', '#BFBF00', '#00BFBF', '#00BF00', '#BF00BF', '#BF0000', '#0000BF'];
const SMPTE_COMPLEMENT = ['#0000BF', '#131313', '#BF00BF', '#131313', '#00BFBF', '#131313', '#BFBFBF'];
const SMPTE_100 = ['#FFFFFF', '#FFFF00', '#00FFFF', '#00FF00', '#FF00FF', '#FF0000', '#0000FF'];

// ─── Kawaii Core Colors ─────────────────────────────────────────

const KAWAII_COLORS = ['#FFB7C5', '#B5EAEA', '#E8D5FF', '#FFEAA7', '#C4FAF8', '#FFD3E0', '#D5AAFF', '#A8E6CF'];
const KAWAII_BG = '#1a1025';

// ─── Frutiger Aero Colors ───────────────────────────────────────

const FRUTIGER_COLORS = ['#00B4D8', '#0096C7', '#48CAE4', '#90E0EF', '#ADE8F4', '#CAF0F8'];
const FRUTIGER_GREEN = ['#52B788', '#74C69D', '#95D5B2', '#B7E4C7', '#D8F3DC'];

// ─── PS1 Retro Colors ──────────────────────────────────────────

const PS1_COLORS = ['#808080', '#C0C0C0', '#404040', '#008080', '#800080', '#808000'];

// ─── Performance Cache ────────────────────────────────────────

let _noiseCanvas: HTMLCanvasElement | null = null;
let _noiseDims = { w: 0, h: 0 };

function getCachedNoiseCanvas(w: number, h: number): HTMLCanvasElement {
  if (_noiseCanvas && _noiseDims.w === w && _noiseDims.h === h) return _noiseCanvas;
  _noiseCanvas = document.createElement('canvas');
  _noiseCanvas.width = w;
  _noiseCanvas.height = h;
  const ctx = _noiseCanvas.getContext('2d')!;
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random() * 8;
    data[i] = noise;
    data[i + 1] = noise;
    data[i + 2] = noise;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  _noiseDims = { w, h };
  return _noiseCanvas;
}

// Cached CRT scanline pattern (avoids hundreds of fillRect calls per slice)
let _scanlinePattern: CanvasPattern | null = null;

function getCachedScanlinePattern(ctx: CanvasRenderingContext2D): CanvasPattern {
  if (_scanlinePattern) return _scanlinePattern;
  const patCanvas = document.createElement('canvas');
  patCanvas.width = 1;
  patCanvas.height = 3;
  const patCtx = patCanvas.getContext('2d')!;
  patCtx.fillStyle = 'rgba(0,0,0,0.15)';
  patCtx.fillRect(0, 0, 1, 1);
  _scanlinePattern = ctx.createPattern(patCanvas, 'repeat')!;
  return _scanlinePattern;
}

// Seeded random for deterministic decorative element placement
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Slice Color Palette ───────────────────────────────────────

const SLICE_HUES = [330, 180, 120, 0, 240, 60, 30, 270, 150, 210];

function sliceColor(index: number): string {
  const hue = SLICE_HUES[index % SLICE_HUES.length];
  return "hsl(" + hue + ", 90%, 55%)";
}

function sliceColorDark(index: number): string {
  const hue = SLICE_HUES[index % SLICE_HUES.length];
  return "hsl(" + hue + ", 70%, 20%)";
}

// ─── Main Generator ─────────────────────────────────────────────

export interface GeneratorOptions {
  template: TemplateType;
  graphicPreset: GraphicPresetType;
  gridSize: number;
  showLabels: boolean;
  showSafeZones: boolean;
  logo: HTMLImageElement | null;
  logoSettings: LogoSettings;
  extraLogos: LogoInstance[];
  decorativeSettings: DecorativeSettings;
  globalOverlay: OverlaySource | null;
  sliceOverlays: SliceOverlays;
  brandName: string;
  animationPreset?: AnimationPresetType;
  videoPreset?: VideoPresetType;
  animationProgress?: number; // 0-1 normalized progress for animation frame
}

// Reusable canvas pool to avoid GC pressure during animation/export
let _reusableCanvas: HTMLCanvasElement | null = null;
let _reusableDims = { w: 0, h: 0 };

function getReusableCanvas(w: number, h: number): HTMLCanvasElement {
  if (_reusableCanvas && _reusableDims.w === w && _reusableDims.h === h) {
    return _reusableCanvas;
  }
  _reusableCanvas = document.createElement('canvas');
  _reusableCanvas.width = w;
  _reusableCanvas.height = h;
  _reusableDims = { w, h };
  return _reusableCanvas;
}

export function generateComposition(
  slices: SliceData[],
  width: number,
  height: number,
  options: GeneratorOptions,
): HTMLCanvasElement {
  const canvas = getReusableCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  renderCompositionInto(ctx, slices, width, height, options);
  return canvas;
}

/** Render composition directly into a provided context (for video export) */
export function renderCompositionInto(
  ctx: CanvasRenderingContext2D,
  slices: SliceData[],
  width: number,
  height: number,
  options: GeneratorOptions,
): void {

  // Background based on graphic preset
  ctx.fillStyle = getPresetBackground(options.graphicPreset);
  ctx.fillRect(0, 0, width, height);

  // Apply graphic preset background effects
  drawPresetBackground(ctx, width, height, options);

  // Draw each slice
  slices.forEach((slice, index) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(slice.x, slice.y, slice.width, slice.height);
    ctx.clip();

    // Slice background
    ctx.fillStyle = getPresetBackground(options.graphicPreset);
    ctx.fillRect(slice.x, slice.y, slice.width, slice.height);

    // Template-specific pattern
    drawTemplate(ctx, slice, index, options);

    // Graphic preset overlay effects
    drawPresetOverlayEffects(ctx, slice, options);

    // Video preset animation frame
    if (options.videoPreset && options.videoPreset !== 'none' && options.animationProgress !== undefined) {
      drawVideoPresetFrame(ctx, slice, options.videoPreset, options.animationProgress);
    }

    // Decorative elements (inside clip)
    if (options.decorativeSettings.enabled.length > 0) {
      drawDecorativeElements(ctx, slice, options.decorativeSettings, options.graphicPreset, options.animationProgress);
    }

    ctx.restore();

    // Border
    drawSliceBorder(ctx, slice, options.graphicPreset);

    // Overlay
    const overlay = options.sliceOverlays[slice.id] || options.globalOverlay;
    if (overlay) drawOverlay(ctx, slice, overlay);

    // Logo with positioning (main + extra instances)
    if (options.logo) {
      drawLogo(ctx, slice, options.logo, options.logoSettings, options.animationPreset, options.animationProgress);
    }
    for (const extra of options.extraLogos) {
      const img = extra.image || options.logo;
      if (img) drawLogo(ctx, slice, img, extra.settings, options.animationPreset, options.animationProgress);
    }

    // Labels
    if (options.showLabels) drawLabels(ctx, slice, options.brandName, options.graphicPreset);
  });
}

function getPresetBackground(preset: GraphicPresetType): string {
  switch (preset) {
    case 'kawaii-core': return '#1a1025';
    case 'frutiger-aero': return '#0a1628';
    case 'retro-ps1': return '#000000';
    default: return '#000000';
  }
}

// ─── Preset Background Effects ──────────────────────────────────

function drawPresetBackground(ctx: CanvasRenderingContext2D, w: number, h: number, options: GeneratorOptions) {
  const preset = options.graphicPreset;
  if (preset === 'kawaii-core') {
    // Soft pastel gradient wash
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, 'rgba(255,183,197,0.05)');
    grad.addColorStop(0.5, 'rgba(181,234,234,0.05)');
    grad.addColorStop(1, 'rgba(232,213,255,0.05)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (preset === 'frutiger-aero') {
    // Sky gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(0,180,216,0.08)');
    grad.addColorStop(0.5, 'rgba(144,224,239,0.04)');
    grad.addColorStop(1, 'rgba(82,183,136,0.06)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (preset === 'retro-ps1') {
    // Dark dithered background - cached noise pattern
    const noiseCanvas = getCachedNoiseCanvas(w, h);
    ctx.drawImage(noiseCanvas, 0, 0);
  }
}

// ─── Preset Overlay Effects (per-slice) ─────────────────────────

function drawPresetOverlayEffects(ctx: CanvasRenderingContext2D, slice: SliceData, options: GeneratorOptions) {
  const { x, y, width, height } = slice;
  const preset = options.graphicPreset;

  if (preset === 'retro-ps1') {
    // CRT scanlines - use a small tiled pattern instead of per-line drawing
    ctx.fillStyle = getCachedScanlinePattern(ctx);
    ctx.fillRect(x, y, width, height);
    // Slight vignette
    const vignette = ctx.createRadialGradient(
      x + width / 2, y + height / 2, Math.min(width, height) * 0.3,
      x + width / 2, y + height / 2, Math.max(width, height) * 0.7
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(x, y, width, height);
    // Color aberration simulation - thin colored edges
    ctx.strokeStyle = 'rgba(255,0,0,0.06)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
    ctx.strokeStyle = 'rgba(0,0,255,0.06)';
    ctx.strokeRect(x - 1, y - 1, width + 2, height + 2);
  } else if (preset === 'kawaii-core') {
    // Soft glow overlay
    const glow = ctx.createRadialGradient(
      x + width / 2, y + height / 2, 0,
      x + width / 2, y + height / 2, Math.max(width, height) * 0.5
    );
    glow.addColorStop(0, 'rgba(255,183,197,0.08)');
    glow.addColorStop(0.5, 'rgba(181,234,234,0.04)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, width, height);
    // Sparkle/star decorations in corners
    drawKawaiiStars(ctx, slice);
  } else if (preset === 'frutiger-aero') {
    // Glossy shine line
    const shine = ctx.createLinearGradient(x, y, x, y + height * 0.4);
    shine.addColorStop(0, 'rgba(255,255,255,0.08)');
    shine.addColorStop(0.5, 'rgba(255,255,255,0.03)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(x, y, width, height * 0.4);
    // Translucent bubbles
    drawAeroBubbles(ctx, slice);
  }
}

function drawKawaiiStars(ctx: CanvasRenderingContext2D, slice: SliceData) {
  const { x, y, width, height } = slice;
  const starSize = Math.min(width, height) * 0.02;
  const positions = [
    [x + width * 0.1, y + height * 0.1],
    [x + width * 0.9, y + height * 0.15],
    [x + width * 0.85, y + height * 0.85],
    [x + width * 0.15, y + height * 0.9],
    [x + width * 0.5, y + height * 0.05],
  ];
  ctx.save();
  positions.forEach(([sx, sy], i) => {
    ctx.fillStyle = KAWAII_COLORS[i % KAWAII_COLORS.length];
    ctx.globalAlpha = 0.3;
    // 4-point star
    ctx.beginPath();
    ctx.moveTo(sx, sy - starSize);
    ctx.lineTo(sx + starSize * 0.3, sy - starSize * 0.3);
    ctx.lineTo(sx + starSize, sy);
    ctx.lineTo(sx + starSize * 0.3, sy + starSize * 0.3);
    ctx.lineTo(sx, sy + starSize);
    ctx.lineTo(sx - starSize * 0.3, sy + starSize * 0.3);
    ctx.lineTo(sx - starSize, sy);
    ctx.lineTo(sx - starSize * 0.3, sy - starSize * 0.3);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

function drawAeroBubbles(ctx: CanvasRenderingContext2D, slice: SliceData) {
  const { x, y, width, height } = slice;
  const bubblePositions = [
    { cx: x + width * 0.2, cy: y + height * 0.3, r: Math.min(width, height) * 0.04 },
    { cx: x + width * 0.7, cy: y + height * 0.2, r: Math.min(width, height) * 0.025 },
    { cx: x + width * 0.8, cy: y + height * 0.7, r: Math.min(width, height) * 0.035 },
    { cx: x + width * 0.35, cy: y + height * 0.8, r: Math.min(width, height) * 0.02 },
  ];
  ctx.save();
  bubblePositions.forEach(({ cx, cy, r }) => {
    // Bubble body
    const bubbleGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    bubbleGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
    bubbleGrad.addColorStop(0.7, 'rgba(0,180,216,0.06)');
    bubbleGrad.addColorStop(1, 'rgba(0,150,199,0.02)');
    ctx.fillStyle = bubbleGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

// ─── Template Router ────────────────────────────────────────────

function drawTemplate(
  ctx: CanvasRenderingContext2D,
  slice: SliceData,
  index: number,
  options: GeneratorOptions,
) {
  switch (options.template) {
    case 'smpte-broadcast':
      drawSMPTE(ctx, slice, options);
      break;
    case 'convergence':
      drawConvergence(ctx, slice, options);
      break;
    case 'led-checkerboard':
      drawCheckerboard(ctx, slice, index, options);
      break;
    case 'grid-mapping':
      drawGridMapping(ctx, slice, options);
      break;
    case 'gradient-focus':
      drawGradientFocus(ctx, slice, options);
      break;
    case 'minimal':
      drawMinimal(ctx, slice, options);
      break;
  }
}

// ─── Template 1: SMPTE Broadcast ────────────────────────────────

function drawSMPTE(ctx: CanvasRenderingContext2D, slice: SliceData, options: GeneratorOptions) {
  const { x, y, width, height } = slice;
  const barWidth = width / 7;
  const preset = options.graphicPreset;

  const colors75 = preset === 'kawaii-core' ? KAWAII_COLORS.slice(0, 7) :
                   preset === 'frutiger-aero' ? [...FRUTIGER_COLORS, FRUTIGER_GREEN[0]] :
                   preset === 'retro-ps1' ? PS1_COLORS.concat(['#606060']) : SMPTE_75;

  // Top section: 75% color bars (67% of height)
  const topH = height * 0.67;
  colors75.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + i * barWidth, y, barWidth + 1, topH);
  });

  // Middle section: complement bars (8% of height)
  const midY = y + topH;
  const midH = height * 0.08;
  SMPTE_COMPLEMENT.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + i * barWidth, midY, barWidth + 1, midH);
  });

  // Bottom section: PLUGE pattern (25% of height)
  const botY = midY + midH;
  const botH = height - topH - midH;
  const pluge = [
    { color: '#00214C', w: barWidth },
    { color: '#FFFFFF', w: barWidth },
    { color: '#320064', w: barWidth },
    { color: '#131313', w: barWidth },
    { color: '#090909', w: barWidth * 0.5 },
    { color: '#131313', w: barWidth * 0.5 },
    { color: '#1D1D1D', w: barWidth * 0.5 },
    { color: '#131313', w: barWidth * 0.5 },
    { color: '#131313', w: barWidth },
  ];
  let px = x;
  pluge.forEach(({ color, w }) => {
    ctx.fillStyle = color;
    ctx.fillRect(px, botY, w + 1, botH);
    px += w;
  });

  // Grid overlay
  drawGrid(ctx, slice, options.gridSize, preset === 'kawaii-core' ? 'rgba(255,183,197,0.1)' : 'rgba(255,255,255,0.08)');

  // Safe zones
  if (options.showSafeZones) {
    const actionSafe = Math.min(width, height) * 0.05;
    const titleSafe = Math.min(width, height) * 0.1;
    const safeColor = preset === 'kawaii-core' ? 'rgba(255,183,197,0.3)' : 'rgba(255,255,255,0.3)';

    ctx.strokeStyle = safeColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(x + actionSafe, y + actionSafe, width - actionSafe * 2, height - actionSafe * 2);
    ctx.setLineDash([4, 8]);
    ctx.strokeRect(x + titleSafe, y + titleSafe, width - titleSafe * 2, height - titleSafe * 2);
    ctx.setLineDash([]);
  }

  drawCrosshair(ctx, slice, preset === 'kawaii-core' ? '#FFB7C5' : '#FFFFFF', 0.08);
}

// ─── Template 2: Convergence ────────────────────────────────────

function drawConvergence(ctx: CanvasRenderingContext2D, slice: SliceData, options: GeneratorOptions) {
  const { x, y, width, height } = slice;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const preset = options.graphicPreset;

  const gridColor = preset === 'kawaii-core' ? 'rgba(255,183,197,0.2)' :
                    preset === 'frutiger-aero' ? 'rgba(0,180,216,0.2)' :
                    preset === 'retro-ps1' ? 'rgba(0,255,0,0.15)' : 'rgba(255,255,255,0.2)';

  drawGrid(ctx, slice, options.gridSize, gridColor);

  // Diagonal grid
  ctx.strokeStyle = gridColor.replace('0.2', '0.1');
  ctx.lineWidth = 0.5;
  const diagStep = options.gridSize;
  for (let d = -width - height; d <= width + height; d += diagStep) {
    ctx.beginPath();
    ctx.moveTo(x + d, y);
    ctx.lineTo(x + d + height, y + height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + d + width, y);
    ctx.lineTo(x + d + width - height, y + height);
    ctx.stroke();
  }

  // Grayscale gradient bar at top
  const barH = Math.max(height * 0.04, 16);
  const barY = y + barH * 1.5;
  const barW = width * 0.6;
  const barX = x + (width - barW) / 2;
  const steps = 16;
  const stepW = barW / steps;
  for (let i = 0; i < steps; i++) {
    const v = Math.round((i / (steps - 1)) * 255);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(barX + i * stepW, barY, stepW + 1, barH);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  // Concentric circles at center
  const maxR = Math.min(width, height) * 0.35;
  for (let i = 1; i <= 7; i++) {
    const r = (maxR / 7) * i;
    const circleColor = preset === 'kawaii-core' ? `rgba(255,183,197,${i === 4 ? 0.5 : 0.15})` :
                        preset === 'frutiger-aero' ? `rgba(0,180,216,${i === 4 ? 0.5 : 0.15})` :
                        i === 4 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
    ctx.strokeStyle = circleColor;
    ctx.lineWidth = i === 7 ? 2 : 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // RGB center crosshair
  const crossLen = Math.min(width, height) * 0.12;
  ctx.strokeStyle = preset === 'retro-ps1' ? '#00FF00' : '#FF0000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - crossLen, cy);
  ctx.lineTo(cx + crossLen, cy);
  ctx.stroke();
  ctx.strokeStyle = preset === 'retro-ps1' ? '#00FF00' : '#00FF00';
  ctx.beginPath();
  ctx.moveTo(cx, cy - crossLen);
  ctx.lineTo(cx, cy + crossLen);
  ctx.stroke();
  ctx.strokeStyle = preset === 'retro-ps1' ? '#00FF00' : '#0066FF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, crossLen * 0.3, 0, Math.PI * 2);
  ctx.stroke();

  // Corner convergence targets
  const cornerOffset = Math.min(width, height) * 0.12;
  const corners = [
    [x + cornerOffset, y + cornerOffset],
    [x + width - cornerOffset, y + cornerOffset],
    [x + width - cornerOffset, y + height - cornerOffset],
    [x + cornerOffset, y + height - cornerOffset],
  ];
  corners.forEach(([ccx, ccy]) => {
    drawConvergenceTarget(ctx, ccx, ccy, cornerOffset * 0.5);
  });

  // Color bar strip at bottom
  const stripColors = preset === 'kawaii-core' ? KAWAII_COLORS.slice(0, 7) : SMPTE_100;
  const stripH = Math.max(height * 0.04, 14);
  const stripW = width * 0.5;
  const stripX = x + (width - stripW) / 2;
  const stripY = y + height - stripH * 2.5;
  const cw = stripW / stripColors.length;
  stripColors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(stripX + i * cw, stripY, cw + 1, stripH);
  });
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.strokeRect(stripX, stripY, stripW, stripH);
}

function drawConvergenceTarget(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  const s = r * 0.6;
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - s, cy);
  ctx.lineTo(cx + s, cy);
  ctx.stroke();
  ctx.strokeStyle = '#00FF00';
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx, cy + s);
  ctx.stroke();
  ctx.strokeStyle = '#0066FF';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.25, 0, Math.PI * 2);
  ctx.stroke();
}

// ─── Template 3: LED Checkerboard ───────────────────────────────

function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  slice: SliceData,
  sliceIndex: number,
  options: GeneratorOptions,
) {
  const { x, y, width, height } = slice;
  const cellSize = options.gridSize;
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const bright = sliceColor(sliceIndex);
  const dark = sliceColorDark(sliceIndex);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const isLight = (row + col) % 2 === 0;
      ctx.fillStyle = isLight ? bright : dark;
      ctx.fillRect(x + col * cellSize, y + row * cellSize, cellSize + 1, cellSize + 1);
    }
  }

  const size = Math.min(width, height) * 0.08;
  const cx = x + width / 2;
  const cy = y + height / 2;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size, cy);
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  const cs = size * 0.5;
  ctx.beginPath();
  ctx.moveTo(cx - cs, cy);
  ctx.lineTo(cx + cs, cy);
  ctx.moveTo(cx, cy - cs);
  ctx.lineTo(cx, cy + cs);
  ctx.stroke();
}

// ─── Template 4: Grid Mapping ───────────────────────────────────

function drawGridMapping(ctx: CanvasRenderingContext2D, slice: SliceData, options: GeneratorOptions) {
  const { x, y, width, height } = slice;
  const cellSize = options.gridSize;
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const preset = options.graphicPreset;

  const lineColor = preset === 'kawaii-core' ? '#FFB7C5' :
                    preset === 'frutiger-aero' ? '#48CAE4' :
                    preset === 'retro-ps1' ? '#00FF00' : '#00CCFF';

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  for (let gx = 0; gx <= width; gx += cellSize) {
    ctx.beginPath();
    ctx.moveTo(x + gx, y);
    ctx.lineTo(x + gx, y + height);
    ctx.stroke();
  }
  for (let gy = 0; gy <= height; gy += cellSize) {
    ctx.beginPath();
    ctx.moveTo(x, y + gy);
    ctx.lineTo(x + width, y + gy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const fontSize = Math.min(cellSize / 4.5, 14);
  if (fontSize >= 6) {
    ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = lineColor;
    ctx.globalAlpha = 0.6;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        ctx.fillText(
          `${col + 1},${row + 1}`,
          x + col * cellSize + cellSize / 2,
          y + row * cellSize + cellSize / 2,
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  const dotColor = preset === 'kawaii-core' ? '#D5AAFF' : '#FF00FF';
  ctx.fillStyle = dotColor;
  for (let gy = 0; gy <= height; gy += cellSize) {
    for (let gx = 0; gx <= width; gx += cellSize) {
      ctx.beginPath();
      ctx.arc(x + gx, y + gy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawCrosshair(ctx, slice, preset === 'kawaii-core' ? '#FFB7C5' : '#FF0066', 0.1);
  drawCornerMarkers(ctx, slice, preset === 'kawaii-core' ? '#FFEAA7' : '#FFFF00');
}

// ─── Template 5: Focus & Geometry ───────────────────────────────

function drawGradientFocus(ctx: CanvasRenderingContext2D, slice: SliceData, options: GeneratorOptions) {
  const { x, y, width, height } = slice;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const maxR = Math.min(width, height) * 0.4;
  const preset = options.graphicPreset;

  const gradColor = preset === 'kawaii-core' ? 'rgba(255,183,197,0.3)' :
                    preset === 'frutiger-aero' ? 'rgba(0,180,216,0.3)' : 'rgba(255,255,255,0.3)';

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  grad.addColorStop(0, gradColor);
  grad.addColorStop(0.5, gradColor.replace('0.3', '0.15'));
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, width, height);

  drawGrid(ctx, slice, options.gridSize, 'rgba(255,255,255,0.08)');

  for (let i = 20; i >= 1; i--) {
    const r = (maxR / 20) * i;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const numLines = 36;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i < numLines; i++) {
    const angle = (Math.PI * 2 * i) / numLines;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
    ctx.stroke();
  }

  drawCrosshair(ctx, slice, '#FF0000', 0.06);

  const cornerR = Math.min(width, height) * 0.06;
  const offset = cornerR * 2.5;
  const corners = [
    [x + offset, y + offset],
    [x + width - offset, y + offset],
    [x + width - offset, y + height - offset],
    [x + offset, y + height - offset],
  ];
  corners.forEach(([ccx, ccy]) => {
    for (let i = 4; i >= 1; i--) {
      const r = (cornerR / 4) * i;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(0,255,255,0.5)' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ccx, ccy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    const s = cornerR * 0.3;
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ccx - s, ccy);
    ctx.lineTo(ccx + s, ccy);
    ctx.moveTo(ccx, ccy - s);
    ctx.lineTo(ccx, ccy + s);
    ctx.stroke();
  });

  const ms = Math.min(width, height) * 0.025;
  ctx.strokeStyle = '#FFFF00';
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(cx - ms, y); ctx.lineTo(cx + ms, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - ms, y + height); ctx.lineTo(cx + ms, y + height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, cy - ms); ctx.lineTo(x, cy + ms); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + width, cy - ms); ctx.lineTo(x + width, cy + ms); ctx.stroke();
  ctx.globalAlpha = 1;
}

// ─── Template 6: Minimal ───────────────────────────────────────

function drawMinimal(ctx: CanvasRenderingContext2D, slice: SliceData, options: GeneratorOptions) {
  const { x, y, width, height } = slice;
  const preset = options.graphicPreset;

  const majorStep = options.gridSize * 2;
  const gridColor = preset === 'kawaii-core' ? 'rgba(255,183,197,0.1)' :
                    preset === 'frutiger-aero' ? 'rgba(0,180,216,0.1)' : 'rgba(255,255,255,0.1)';
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let gx = 0; gx <= width; gx += majorStep) {
    ctx.beginPath();
    ctx.moveTo(x + gx, y);
    ctx.lineTo(x + gx, y + height);
    ctx.stroke();
  }
  for (let gy = 0; gy <= height; gy += majorStep) {
    ctx.beginPath();
    ctx.moveTo(x, y + gy);
    ctx.lineTo(x + width, y + gy);
    ctx.stroke();
  }

  drawCrosshair(ctx, slice, preset === 'kawaii-core' ? '#FFB7C5' : '#FFFFFF', 0.06, 1);

  const ms = Math.min(width, height) * 0.04;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y + ms); ctx.lineTo(x, y); ctx.lineTo(x + ms, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + width - ms, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + ms); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + width, y + height - ms); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width - ms, y + height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + ms, y + height); ctx.lineTo(x, y + height); ctx.lineTo(x, y + height - ms); ctx.stroke();
}

// ─── Video Preset Frame Drawing ─────────────────────────────────

function drawVideoPresetFrame(
  ctx: CanvasRenderingContext2D,
  slice: SliceData,
  preset: VideoPresetType,
  progress: number,
) {
  const { x, y, width, height } = slice;

  switch (preset) {
    case 'color-cycle': {
      const hue = Math.round(progress * 360);
      ctx.fillStyle = `hsla(${hue}, 80%, 50%, 0.15)`;
      ctx.fillRect(x, y, width, height);
      break;
    }
    case 'gradient-sweep': {
      const offset = progress * width * 2 - width;
      const grad = ctx.createLinearGradient(x + offset, y, x + offset + width * 0.5, y + height);
      grad.addColorStop(0, 'rgba(0,255,255,0.15)');
      grad.addColorStop(0.5, 'rgba(255,0,255,0.1)');
      grad.addColorStop(1, 'rgba(0,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, width, height);
      break;
    }
    case 'scanline-scroll': {
      const scrollOffset = Math.round(progress * 40);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (let sy = -40 + scrollOffset; sy < height; sy += 8) {
        ctx.fillRect(x, y + sy, width, 2);
      }
      break;
    }
    case 'noise-static': {
      // Optimized: draw random rectangles instead of per-pixel manipulation
      ctx.save();
      const blockSize = 4;
      for (let py = 0; py < height; py += blockSize) {
        for (let px = 0; px < width; px += blockSize) {
          const v = Math.random() * 40;
          ctx.fillStyle = `rgba(${v},${v},${v},0.3)`;
          ctx.fillRect(x + px, y + py, blockSize, blockSize);
        }
      }
      ctx.restore();
      break;
    }
    case 'plasma': {
      const t = progress * Math.PI * 2;
      ctx.save();
      ctx.globalAlpha = 0.12;
      // Larger cells for better performance
      const cellSize = 12;
      for (let py = 0; py < height; py += cellSize) {
        for (let px = 0; px < width; px += cellSize) {
          const v1 = Math.sin(px * 0.02 + t);
          const v2 = Math.sin(py * 0.02 + t * 1.3);
          const v3 = Math.sin((px + py) * 0.015 + t * 0.7);
          const val = (v1 + v2 + v3) / 3;
          const hue = ((val + 1) * 180) | 0;
          ctx.fillStyle = `hsl(${hue}, 90%, 55%)`;
          ctx.fillRect(x + px, y + py, cellSize, cellSize);
        }
      }
      ctx.restore();
      break;
    }
    case 'rainbow-bars': {
      const barW = width / 12;
      const scrollX = progress * barW * 12;
      ctx.save();
      ctx.globalAlpha = 0.12;
      for (let i = -1; i < 14; i++) {
        const hue = ((i * 30) + progress * 360) % 360;
        ctx.fillStyle = `hsl(${hue}, 90%, 55%)`;
        ctx.fillRect(x + i * barW - scrollX % barW, y, barW + 1, height);
      }
      ctx.restore();
      break;
    }
    case 'countdown-loop': {
      const seconds = 5 - Math.floor(progress * 5);
      const fraction = (progress * 5) % 1;
      const cx = x + width / 2;
      const cy = y + height / 2;
      const r = Math.min(width, height) * 0.2;

      // Arc countdown
      ctx.save();
      ctx.strokeStyle = 'rgba(0,255,255,0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (1 - fraction) * Math.PI * 2);
      ctx.stroke();

      // Number
      const numSize = r * 0.8;
      ctx.font = `bold ${numSize}px 'Arial', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(String(seconds), cx, cy);
      ctx.restore();
      break;
    }
    case 'waveform': {
      const cx = x;
      const cy = y + height / 2;
      const amplitude = height * 0.2;
      ctx.save();
      ctx.strokeStyle = 'rgba(0,255,0,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let px = 0; px < width; px += 2) {
        const wave = Math.sin((px / width) * Math.PI * 6 + progress * Math.PI * 2) * amplitude;
        if (px === 0) ctx.moveTo(cx + px, cy + wave);
        else ctx.lineTo(cx + px, cy + wave);
      }
      ctx.stroke();
      // Second harmonic
      ctx.strokeStyle = 'rgba(255,0,100,0.3)';
      ctx.beginPath();
      for (let px = 0; px < width; px += 2) {
        const wave = Math.sin((px / width) * Math.PI * 10 + progress * Math.PI * 4) * amplitude * 0.5;
        if (px === 0) ctx.moveTo(cx + px, cy + wave);
        else ctx.lineTo(cx + px, cy + wave);
      }
      ctx.stroke();
      ctx.restore();
      break;
    }
  }
}

// ─── Decorative Elements System ─────────────────────────────────

function getDecorativeColors(preset: GraphicPresetType): string[] {
  switch (preset) {
    case 'kawaii-core': return KAWAII_COLORS;
    case 'frutiger-aero': return [...FRUTIGER_COLORS, ...FRUTIGER_GREEN];
    case 'retro-ps1': return ['#00FF00', '#00CC00', '#008800', '#33FF33', '#66FF66', '#009900'];
    default: return ['#FFFFFF', '#00FFFF', '#FF00FF', '#FFFF00', '#00FF00', '#FF6600'];
  }
}

function drawDecorativeElements(
  ctx: CanvasRenderingContext2D,
  slice: SliceData,
  settings: DecorativeSettings,
  preset: GraphicPresetType,
  animProgress?: number,
) {
  const { x, y, width, height } = slice;
  const colors = getDecorativeColors(preset);
  const baseSize = Math.min(width, height) * 0.025 * (settings.size / 100);
  const count = settings.density * 4; // 4 to 20 elements
  const rng = seededRandom(slice.x * 1000 + slice.y * 7 + width * 13 + height * 31);

  ctx.save();

  for (const elemType of settings.enabled) {
    for (let i = 0; i < count; i++) {
      const ex = x + rng() * width;
      const ey = y + rng() * height;
      const color = colors[Math.floor(rng() * colors.length)];
      const sizeVariation = 0.5 + rng() * 1.0;
      const elemSize = baseSize * sizeVariation;
      const elemPhase = rng() * Math.PI * 2; // unique phase offset per element
      const elemSpeed = 0.5 + rng() * 0.5; // unique speed per element

      // Smooth multi-axis animation (uses integer frequency multipliers for perfect looping)
      let animX = 0, animY = 0, animScale = 1, animAlpha = settings.opacity / 100;
      let animRotation = 0;
      if (settings.animated && animProgress !== undefined) {
        const speed = settings.animSpeed;
        // Use integer-based frequencies so all sin/cos complete full cycles at progress=1
        const t = animProgress * Math.PI * 2 * speed;
        // Smooth floating: combined sin/cos for organic Lissajous-like movement
        animY = Math.sin(t * elemSpeed + elemPhase) * elemSize * 0.5;
        animX = Math.cos(t * elemSpeed * 0.7 + elemPhase + 1.3) * elemSize * 0.25;
        // Gentle scale pulse
        animScale = 1 + Math.sin(t * elemSpeed * 0.5 + elemPhase) * 0.12;
        // Subtle rotation
        animRotation = Math.sin(t * elemSpeed * 0.3 + elemPhase) * 0.15;
        // Gentle opacity breathing
        animAlpha = (settings.opacity / 100) * (0.85 + Math.sin(t * elemSpeed * 0.4 + elemPhase) * 0.15);
      }

      ctx.save();
      ctx.globalAlpha = animAlpha;
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, elemSize * 0.1);

      // Apply transform from element center
      if (settings.animated && animProgress !== undefined) {
        ctx.translate(ex + animX, ey + animY);
        ctx.rotate(animRotation);
        ctx.scale(animScale, animScale);
        ctx.translate(-(ex + animX), -(ey + animY));
      }

      const drawX = ex + animX;
      const drawY = ey + animY;

      switch (elemType) {
        case 'stars':
          drawStar(ctx, drawX, drawY, elemSize, 4);
          break;
        case 'hearts':
          drawHeart(ctx, drawX, drawY, elemSize);
          break;
        case 'sparkles':
          drawSparkle(ctx, drawX, drawY, elemSize);
          break;
        case 'music-notes':
          drawMusicNote(ctx, drawX, drawY, elemSize);
          break;
        case 'flowers':
          drawFlower(ctx, drawX, drawY, elemSize, color);
          break;
        case 'diamonds':
          drawDiamond(ctx, drawX, drawY, elemSize);
          break;
        case 'clouds':
          drawCloud(ctx, drawX, drawY, elemSize);
          break;
        case 'pixels':
          drawPixelBlock(ctx, drawX, drawY, elemSize);
          break;
        case 'circles':
          drawDecoCircle(ctx, drawX, drawY, elemSize);
          break;
        case 'crosses':
          drawDecoCross(ctx, drawX, drawY, elemSize);
          break;
        case 'arrows':
          drawArrow(ctx, drawX, drawY, elemSize, rng());
          break;
        case 'lightning':
          drawLightning(ctx, drawX, drawY, elemSize);
          break;
      }
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, points: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI * 2 * i) / (points * 2) - Math.PI / 2;
    const r = i % 2 === 0 ? size : size * 0.35;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size * 0.6;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.6);
  ctx.bezierCurveTo(cx - s, cy - s * 0.2, cx - s * 0.5, cy - s, cx, cy - s * 0.4);
  ctx.bezierCurveTo(cx + s * 0.5, cy - s, cx + s, cy - s * 0.2, cx, cy + s * 0.6);
  ctx.closePath();
  ctx.fill();
}

function drawSparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // 6-point sparkle with alternating long and short rays
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12 - Math.PI / 2;
    const r = i % 2 === 0 ? size : size * 0.2;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  // Inner glow dot
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
}

function drawMusicNote(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size * 0.5;
  // Note head (filled ellipse)
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.3, s * 0.35, s * 0.25, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Stem
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.3, cy + s * 0.2);
  ctx.lineTo(cx + s * 0.3, cy - s * 0.8);
  ctx.stroke();
  // Flag
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.3, cy - s * 0.8);
  ctx.quadraticCurveTo(cx + s * 0.8, cy - s * 0.4, cx + s * 0.3, cy - s * 0.1);
  ctx.stroke();
}

function drawFlower(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  const petalCount = 5;
  const petalR = size * 0.5;
  // Petals
  for (let i = 0; i < petalCount; i++) {
    const angle = (Math.PI * 2 * i) / petalCount;
    const px = cx + Math.cos(angle) * petalR * 0.5;
    const py = cy + Math.sin(angle) * petalR * 0.5;
    ctx.beginPath();
    ctx.arc(px, py, petalR * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Center
  ctx.fillStyle = adjustBrightness(color, 1.5);
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
}

function adjustBrightness(hex: string, factor: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) * factor);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size * 0.7;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx + s * 0.6, cy);
  ctx.lineTo(cx, cy + s);
  ctx.lineTo(cx - s * 0.6, cy);
  ctx.closePath();
  ctx.fill();
  // Inner highlight line
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.4, cy - s * 0.15);
  ctx.lineTo(cx + s * 0.4, cy - s * 0.15);
  ctx.stroke();
  ctx.restore();
}

function drawCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size * 0.6;
  ctx.beginPath();
  ctx.arc(cx - s * 0.3, cy, s * 0.35, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.3, cy, s * 0.35, 0, Math.PI * 2);
  ctx.arc(cx, cy - s * 0.2, s * 0.45, 0, Math.PI * 2);
  ctx.arc(cx, cy + s * 0.1, s * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawPixelBlock(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size * 0.4;
  const grid = 3;
  const cellSize = (s * 2) / grid;
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      if ((r + c) % 2 === 0 || (r === 1 && c === 1)) {
        ctx.fillRect(cx - s + c * cellSize, cy - s + r * cellSize, cellSize - 1, cellSize - 1);
      }
    }
  }
}

function drawDecoCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Concentric ring
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawDecoCross(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size * 0.7;
  const w = s * 0.3;
  ctx.fillRect(cx - w / 2, cy - s, w, s * 2);
  ctx.fillRect(cx - s, cy - w / 2, s * 2, w);
}

function drawArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, rotation: number) {
  const s = size * 0.7;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation * Math.PI * 2);
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.5, -s * 0.3);
  ctx.lineTo(s * 0.15, -s * 0.3);
  ctx.lineTo(s * 0.15, s);
  ctx.lineTo(-s * 0.15, s);
  ctx.lineTo(-s * 0.15, -s * 0.3);
  ctx.lineTo(-s * 0.5, -s * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawLightning(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size * 0.7;
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.1, cy - s);
  ctx.lineTo(cx - s * 0.2, cy - s * 0.05);
  ctx.lineTo(cx + s * 0.05, cy - s * 0.05);
  ctx.lineTo(cx - s * 0.15, cy + s);
  ctx.lineTo(cx + s * 0.25, cy + s * 0.05);
  ctx.lineTo(cx - s * 0.02, cy + s * 0.05);
  ctx.closePath();
  ctx.fill();
}

// ─── Shared Drawing Utilities ───────────────────────────────────

function drawGrid(
  ctx: CanvasRenderingContext2D,
  slice: SliceData,
  gridSize: number,
  color: string,
) {
  const { x, y, width, height } = slice;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  for (let gx = 0; gx <= width; gx += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x + gx, y);
    ctx.lineTo(x + gx, y + height);
    ctx.stroke();
  }
  for (let gy = 0; gy <= height; gy += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, y + gy);
    ctx.lineTo(x + width, y + gy);
    ctx.stroke();
  }
}

function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  slice: SliceData,
  color: string,
  sizeRatio: number,
  lineWidth = 2,
) {
  const { x, y, width, height } = slice;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const len = Math.min(width, height) * sizeRatio;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;

  ctx.beginPath();
  ctx.moveTo(cx - len, cy);
  ctx.lineTo(cx + len, cy);
  ctx.moveTo(cx, cy - len);
  ctx.lineTo(cx, cy + len);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  const inner = len * 0.3;
  ctx.beginPath();
  ctx.moveTo(cx - inner, cy);
  ctx.lineTo(cx + inner, cy);
  ctx.moveTo(cx, cy - inner);
  ctx.lineTo(cx, cy + inner);
  ctx.stroke();

  ctx.restore();
}

function drawCornerMarkers(ctx: CanvasRenderingContext2D, slice: SliceData, color: string) {
  const { x, y, width, height } = slice;
  const ms = Math.min(width, height) * 0.04;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.7;

  ctx.beginPath(); ctx.moveTo(x + ms, y); ctx.lineTo(x, y); ctx.lineTo(x, y + ms); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + width - ms, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + ms); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + width - ms, y + height); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width, y + height - ms); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + ms, y + height); ctx.lineTo(x, y + height); ctx.lineTo(x, y + height - ms); ctx.stroke();

  ctx.globalAlpha = 1;
}

function drawSliceBorder(ctx: CanvasRenderingContext2D, slice: SliceData, preset: GraphicPresetType = 'default') {
  const { x, y, width, height } = slice;
  ctx.save();

  const borderColor = preset === 'kawaii-core' ? '#FFB7C5' :
                      preset === 'frutiger-aero' ? '#48CAE4' :
                      preset === 'retro-ps1' ? '#00FF00' : '#FFFFFF';
  const accentColor = preset === 'kawaii-core' ? '#D5AAFF' :
                      preset === 'frutiger-aero' ? '#90E0EF' :
                      preset === 'retro-ps1' ? '#00FF00' : '#00FFFF';

  ctx.shadowColor = borderColor;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  ctx.shadowBlur = 0;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);

  ctx.restore();
}

function drawOverlay(ctx: CanvasRenderingContext2D, slice: SliceData, src: OverlaySource) {
  const { x, y, width, height } = slice;
  const maxSize = Math.min(width, height) * 0.18;

  const sw = src instanceof HTMLVideoElement ? src.videoWidth : src.naturalWidth;
  const sh = src instanceof HTMLVideoElement ? src.videoHeight : src.naturalHeight;
  if (!sw || !sh) return;

  const ratio = Math.min(maxSize / sw, maxSize / sh);
  const dw = sw * ratio;
  const dh = sh * ratio;
  const dx = x + (width - dw) / 2;
  const dy = y + height * 0.15;

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.drawImage(src, dx, dy, dw, dh);
  ctx.restore();
}

// ─── Logo with Positioning & Animation ──────────────────────────

function drawLogo(
  ctx: CanvasRenderingContext2D,
  slice: SliceData,
  logo: HTMLImageElement,
  settings: LogoSettings,
  animPreset?: AnimationPresetType,
  animProgress?: number,
) {
  const { x, y, width, height } = slice;
  const logoSize = Math.min(width, height) * (settings.size / 100);
  const ratio = Math.min(logoSize / logo.naturalWidth, logoSize / logo.naturalHeight);
  let dw = logo.naturalWidth * ratio;
  let dh = logo.naturalHeight * ratio;
  const pad = settings.padding;

  // Calculate position
  let dx: number, dy: number;
  switch (settings.position) {
    case 'top-left':      dx = x + pad; dy = y + pad; break;
    case 'top-center':    dx = x + (width - dw) / 2; dy = y + pad; break;
    case 'top-right':     dx = x + width - dw - pad; dy = y + pad; break;
    case 'center-left':   dx = x + pad; dy = y + (height - dh) / 2; break;
    case 'center':        dx = x + (width - dw) / 2; dy = y + (height - dh) / 2; break;
    case 'center-right':  dx = x + width - dw - pad; dy = y + (height - dh) / 2; break;
    case 'bottom-left':   dx = x + pad; dy = y + height - dh - pad; break;
    case 'bottom-center': dx = x + (width - dw) / 2; dy = y + height - dh - pad; break;
    case 'bottom-right':  dx = x + width - dw - pad; dy = y + height - dh - pad; break;
    default:              dx = x + width - dw - pad; dy = y + pad; break;
  }

  ctx.save();

  // Animation transforms
  let opacity = settings.opacity / 100;
  let offsetX = 0, offsetY = 0, scale = 1, rotation = settings.rotation;

  if (animPreset && animPreset !== 'none' && animProgress !== undefined) {
    const t = animProgress;
    const pi2 = Math.PI * 2;
    switch (animPreset) {
      case 'pulse':
        scale = 1 + Math.sin(t * pi2) * 0.15;
        break;
      case 'rotate':
        rotation = settings.rotation + t * 360;
        break;
      case 'bounce':
        offsetY = -Math.abs(Math.sin(t * pi2)) * dh * 0.3;
        break;
      case 'fade-in-out':
        opacity *= 0.3 + Math.sin(t * pi2) * 0.7;
        break;
      case 'slide-horizontal':
        offsetX = Math.sin(t * pi2) * width * 0.05;
        break;
      case 'slide-vertical':
        offsetY = Math.sin(t * pi2) * height * 0.05;
        break;
      case 'zoom-in-out':
        scale = 0.7 + Math.sin(t * pi2) * 0.3 + 0.3;
        break;
      case 'glitch':
        offsetX = (Math.random() - 0.5) * 6;
        offsetY = (Math.random() - 0.5) * 6;
        break;
    }
  }

  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  ctx.globalCompositeOperation = settings.blendMode;

  // Apply transforms from center of logo
  const centerX = dx + dw / 2 + offsetX;
  const centerY = dy + dh / 2 + offsetY;
  ctx.translate(centerX, centerY);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(scale, scale);

  ctx.drawImage(logo, -dw / 2, -dh / 2, dw, dh);

  ctx.restore();
}

function drawLabels(ctx: CanvasRenderingContext2D, slice: SliceData, brandName: string, preset: GraphicPresetType = 'default') {
  const { x, y, width, height, name } = slice;
  ctx.save();

  const accentColor = preset === 'kawaii-core' ? '#FFB7C5' :
                      preset === 'frutiger-aero' ? '#48CAE4' :
                      preset === 'retro-ps1' ? '#00FF00' : '#00FFFF';
  const textColor = preset === 'retro-ps1' ? '#00FF00' : '#FFFFFF';
  const fontFamily = preset === 'retro-ps1' ? "'Courier New', monospace" :
                     preset === 'kawaii-core' ? "'Arial Rounded MT Bold', 'Arial', sans-serif" : "'Arial', sans-serif";

  // Position badge (top-left)
  const badgeFontSize = Math.max(8, Math.min(width / 40, 12));
  ctx.font = `bold ${badgeFontSize}px 'Courier New', monospace`;
  const posText = `${Math.round(x)}, ${Math.round(y)}`;
  const tw = ctx.measureText(posText).width;
  const pad = 4;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(x + 6, y + 6, tw + pad * 2, badgeFontSize + pad);
  ctx.strokeStyle = accentColor.replace(')', ',0.5)').replace('rgb', 'rgba').replace('#', '');
  ctx.strokeStyle = accentColor + '80';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 6, y + 6, tw + pad * 2, badgeFontSize + pad);
  ctx.fillStyle = accentColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(posText, x + 6 + pad, y + 6 + pad / 2);

  // Slice name (center)
  const nameFontSize = Math.max(14, Math.min(width / 14, 36));
  ctx.font = `bold ${nameFontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = textColor;
  ctx.fillText(name.toUpperCase(), x + width / 2, y + height / 2 - 10);
  ctx.shadowBlur = 0;

  // Dimensions
  const dimFontSize = Math.max(10, Math.min(width / 28, 16));
  ctx.font = `bold ${dimFontSize}px 'Courier New', monospace`;
  const dimText = `${slice.width} x ${slice.height}`;
  const dimW = ctx.measureText(dimText).width;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x + width / 2 - dimW / 2 - 6, y + height / 2 + 8, dimW + 12, dimFontSize + 6);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(dimText, x + width / 2, y + height / 2 + 8 + (dimFontSize + 6) / 2);

  // Brand name (bottom center)
  if (brandName) {
    const brandFontSize = Math.max(8, Math.min(width / 30, 14));
    ctx.font = `${brandFontSize}px ${fontFamily}`;
    ctx.fillStyle = preset === 'kawaii-core' ? 'rgba(255,183,197,0.5)' : 'rgba(255,255,255,0.4)';
    ctx.fillText(brandName, x + width / 2, y + height - brandFontSize);
  }

  ctx.restore();
}
