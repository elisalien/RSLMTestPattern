import { TemplateType, SliceData, OverlaySource, SliceOverlays } from '../types';

// ─── SMPTE Color Constants ──────────────────────────────────────

const SMPTE_75 = ['#BFBFBF', '#BFBF00', '#00BFBF', '#00BF00', '#BF00BF', '#BF0000', '#0000BF'];
const SMPTE_COMPLEMENT = ['#0000BF', '#131313', '#BF00BF', '#131313', '#00BFBF', '#131313', '#BFBFBF'];
const SMPTE_100 = ['#FFFFFF', '#FFFF00', '#00FFFF', '#00FF00', '#FF00FF', '#FF0000', '#0000FF'];

// ─── Slice Color Palette (for LED Checkerboard & Solid ID) ──────

const SLICE_HUES = [330, 180, 120, 0, 240, 60, 30, 270, 150, 210];

function sliceColor(index: number): string {
  const hue = SLICE_HUES[index % SLICE_HUES.length];
  return `hsl(${hue}, 90%, 55%)`;
}

function sliceColorDark(index: number): string {
  const hue = SLICE_HUES[index % SLICE_HUES.length];
  return `hsl(${hue}, 70%, 20%)`;
}

// ─── Main Generator ─────────────────────────────────────────────

export interface GeneratorOptions {
  template: TemplateType;
  gridSize: number;
  showLabels: boolean;
  showSafeZones: boolean;
  logo: HTMLImageElement | null;
  globalOverlay: OverlaySource | null;
  sliceOverlays: SliceOverlays;
  brandName: string;
}

export function generateComposition(
  slices: SliceData[],
  width: number,
  height: number,
  options: GeneratorOptions,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Draw each slice
  slices.forEach((slice, index) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(slice.x, slice.y, slice.width, slice.height);
    ctx.clip();

    // Black fill for slice
    ctx.fillStyle = '#000000';
    ctx.fillRect(slice.x, slice.y, slice.width, slice.height);

    // Template-specific pattern
    drawTemplate(ctx, slice, index, options);

    ctx.restore();

    // Border (outside clip)
    drawSliceBorder(ctx, slice);

    // Overlay (logo / video / image)
    const overlay = options.sliceOverlays[slice.id] || options.globalOverlay;
    if (overlay) drawOverlay(ctx, slice, overlay);
    if (options.logo) drawLogo(ctx, slice, options.logo);

    // Labels
    if (options.showLabels) drawLabels(ctx, slice, options.brandName);
  });

  return canvas;
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

  // Top section: 75% color bars (67% of height)
  const topH = height * 0.67;
  SMPTE_75.forEach((color, i) => {
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
  drawGrid(ctx, slice, options.gridSize, 'rgba(255,255,255,0.08)');

  // Safe zones
  if (options.showSafeZones) {
    const actionSafe = Math.min(width, height) * 0.05;
    const titleSafe = Math.min(width, height) * 0.1;

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(x + actionSafe, y + actionSafe, width - actionSafe * 2, height - actionSafe * 2);
    ctx.setLineDash([4, 8]);
    ctx.strokeRect(x + titleSafe, y + titleSafe, width - titleSafe * 2, height - titleSafe * 2);
    ctx.setLineDash([]);
  }

  // Center crosshair
  drawCrosshair(ctx, slice, '#FFFFFF', 0.08);
}

// ─── Template 2: Convergence ────────────────────────────────────

function drawConvergence(ctx: CanvasRenderingContext2D, slice: SliceData, options: GeneratorOptions) {
  const { x, y, width, height } = slice;
  const cx = x + width / 2;
  const cy = y + height / 2;

  // Main grid
  drawGrid(ctx, slice, options.gridSize, 'rgba(255,255,255,0.2)');

  // Diagonal grid
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
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
    ctx.strokeStyle = i === 4 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = i === 7 ? 2 : 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // RGB center crosshair
  const crossLen = Math.min(width, height) * 0.12;
  // Red horizontal
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - crossLen, cy);
  ctx.lineTo(cx + crossLen, cy);
  ctx.stroke();
  // Green vertical
  ctx.strokeStyle = '#00FF00';
  ctx.beginPath();
  ctx.moveTo(cx, cy - crossLen);
  ctx.lineTo(cx, cy + crossLen);
  ctx.stroke();
  // Blue circle at center
  ctx.strokeStyle = '#0066FF';
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
  const stripH = Math.max(height * 0.04, 14);
  const stripW = width * 0.5;
  const stripX = x + (width - stripW) / 2;
  const stripY = y + height - stripH * 2.5;
  const cw = stripW / SMPTE_100.length;
  SMPTE_100.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(stripX + i * cw, stripY, cw + 1, stripH);
  });
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.strokeRect(stripX, stripY, stripW, stripH);
}

function drawConvergenceTarget(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  // Outer circle
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Inner circle
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  // RGB crosshairs (small)
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
      ctx.fillRect(
        x + col * cellSize,
        y + row * cellSize,
        cellSize + 1,
        cellSize + 1,
      );
    }
  }

  // Center diamond marker
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

  // Inner crosshair
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

  // Grid lines
  ctx.strokeStyle = '#00CCFF';
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

  // Cell numbering
  const fontSize = Math.min(cellSize / 4.5, 14);
  if (fontSize >= 6) {
    ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#00CCFF';
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

  // Intersection dots
  ctx.fillStyle = '#FF00FF';
  for (let gy = 0; gy <= height; gy += cellSize) {
    for (let gx = 0; gx <= width; gx += cellSize) {
      ctx.beginPath();
      ctx.arc(x + gx, y + gy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Center crosshair
  drawCrosshair(ctx, slice, '#FF0066', 0.1);

  // Corner markers (yellow L-shapes)
  drawCornerMarkers(ctx, slice, '#FFFF00');
}

// ─── Template 5: Focus & Geometry ───────────────────────────────

function drawGradientFocus(ctx: CanvasRenderingContext2D, slice: SliceData, options: GeneratorOptions) {
  const { x, y, width, height } = slice;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const maxR = Math.min(width, height) * 0.4;

  // Radial gradient sphere at center
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  grad.addColorStop(0, 'rgba(255,255,255,0.3)');
  grad.addColorStop(0.5, 'rgba(100,150,255,0.15)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, width, height);

  // Subtle grid
  drawGrid(ctx, slice, options.gridSize, 'rgba(255,255,255,0.08)');

  // Alternating B/W concentric circles (focus test)
  for (let i = 20; i >= 1; i--) {
    const r = (maxR / 20) * i;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Radial lines from center (Siemens star style)
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

  // Center precision crosshair
  drawCrosshair(ctx, slice, '#FF0000', 0.06);

  // Corner focus targets (concentric rings)
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
    // Small cross
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

  // Edge midpoint markers
  const ms = Math.min(width, height) * 0.025;
  ctx.strokeStyle = '#FFFF00';
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.6;
  // Top
  ctx.beginPath(); ctx.moveTo(cx - ms, y); ctx.lineTo(cx + ms, y); ctx.stroke();
  // Bottom
  ctx.beginPath(); ctx.moveTo(cx - ms, y + height); ctx.lineTo(cx + ms, y + height); ctx.stroke();
  // Left
  ctx.beginPath(); ctx.moveTo(x, cy - ms); ctx.lineTo(x, cy + ms); ctx.stroke();
  // Right
  ctx.beginPath(); ctx.moveTo(x + width, cy - ms); ctx.lineTo(x + width, cy + ms); ctx.stroke();
  ctx.globalAlpha = 1;
}

// ─── Template 6: Minimal ───────────────────────────────────────

function drawMinimal(ctx: CanvasRenderingContext2D, slice: SliceData, options: GeneratorOptions) {
  const { x, y, width, height } = slice;

  // Sparse major grid only
  const majorStep = options.gridSize * 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
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

  // Thin center crosshair
  drawCrosshair(ctx, slice, '#FFFFFF', 0.06, 1);

  // Minimal corner marks
  const ms = Math.min(width, height) * 0.04;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  // TL
  ctx.beginPath(); ctx.moveTo(x, y + ms); ctx.lineTo(x, y); ctx.lineTo(x + ms, y); ctx.stroke();
  // TR
  ctx.beginPath(); ctx.moveTo(x + width - ms, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + ms); ctx.stroke();
  // BR
  ctx.beginPath(); ctx.moveTo(x + width, y + height - ms); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width - ms, y + height); ctx.stroke();
  // BL
  ctx.beginPath(); ctx.moveTo(x + ms, y + height); ctx.lineTo(x, y + height); ctx.lineTo(x, y + height - ms); ctx.stroke();
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

  // Inner detail
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

function drawSliceBorder(ctx: CanvasRenderingContext2D, slice: SliceData) {
  const { x, y, width, height } = slice;
  ctx.save();

  // Outer glow
  ctx.shadowColor = '#FFFFFF';
  ctx.shadowBlur = 6;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  // Inner accent
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#00FFFF';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);

  ctx.restore();
}

function drawOverlay(ctx: CanvasRenderingContext2D, slice: SliceData, src: OverlaySource) {
  const { x, y, width, height } = slice;
  const maxSize = Math.min(width, height) * 0.18;

  // Get source dimensions
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

function drawLogo(ctx: CanvasRenderingContext2D, slice: SliceData, logo: HTMLImageElement) {
  const { x, y, width, height } = slice;
  const logoSize = Math.min(width, height) * 0.1;
  const ratio = Math.min(logoSize / logo.naturalWidth, logoSize / logo.naturalHeight);
  const dw = logo.naturalWidth * ratio;
  const dh = logo.naturalHeight * ratio;

  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.drawImage(logo, x + width - dw - 10, y + 10, dw, dh);
  ctx.restore();
}

function drawLabels(ctx: CanvasRenderingContext2D, slice: SliceData, brandName: string) {
  const { x, y, width, height, name } = slice;
  ctx.save();

  // Position badge (top-left)
  const badgeFontSize = Math.max(8, Math.min(width / 40, 12));
  ctx.font = `bold ${badgeFontSize}px 'Courier New', monospace`;
  const posText = `${Math.round(x)}, ${Math.round(y)}`;
  const tw = ctx.measureText(posText).width;
  const pad = 4;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(x + 6, y + 6, tw + pad * 2, badgeFontSize + pad);
  ctx.strokeStyle = 'rgba(0,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 6, y + 6, tw + pad * 2, badgeFontSize + pad);
  ctx.fillStyle = '#00FFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(posText, x + 6 + pad, y + 6 + pad / 2);

  // Slice name (center)
  const nameFontSize = Math.max(14, Math.min(width / 14, 36));
  ctx.font = `bold ${nameFontSize}px 'Arial', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#FFFFFF';
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
    ctx.font = `${brandFontSize}px 'Arial', sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(brandName, x + width / 2, y + height - brandFontSize);
  }

  ctx.restore();
}
