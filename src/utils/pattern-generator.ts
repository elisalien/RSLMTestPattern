import { TemplateConfig, SliceData, SliceGifConfig } from '../types';

export class TestPatternGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
  }

  /**
   * Generate COMPLETE composition with all slices positioned correctly
   * Each slice gets a COMPLETE test pattern (not a piece of a larger pattern)
   */
  generateComposition(
    slices: SliceData[],
    compositionWidth: number,
    compositionHeight: number,
    config: TemplateConfig,
    sliceGifs: SliceGifConfig,
    logo?: HTMLImageElement | null,
    globalGif?: HTMLImageElement | null
  ): HTMLCanvasElement {
    // Create canvas at composition size
    this.canvas.width = compositionWidth;
    this.canvas.height = compositionHeight;

    // Black background (default)
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, compositionWidth, compositionHeight);

    // Draw each slice with its complete test pattern
    slices.forEach(slice => {
      this.drawSliceTemplate(slice, config, logo, sliceGifs[slice.id] || globalGif);
    });

    return this.canvas;
  }

  /**
   * Draw a single slice with the selected template
   * Each slice gets a COMPLETE pattern with all standard test elements
   */
  private drawSliceTemplate(
    slice: SliceData,
    config: TemplateConfig,
    logo?: HTMLImageElement | null,
    gif?: HTMLImageElement | null
  ) {
    const { x, y, width, height } = slice;

    // Save context
    this.ctx.save();

    // Clip to slice area
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    this.ctx.clip();

    // Black background for this slice
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(x, y, width, height);

    // Draw template-specific pattern
    switch (config.type) {
      case 'classic-broadcast':
        this.drawClassicBroadcast(slice, config);
        break;
      case 'led-panel-pro':
        this.drawLEDPanelPro(slice, config);
        break;
      case 'projection-alignment':
        this.drawProjectionAlignment(slice, config);
        break;
      case 'minimal-clean':
        this.drawMinimalClean(slice, config);
        break;
    }

    // Restore context
    this.ctx.restore();

    // Draw slice border (outside clip)
    this.drawSliceBorder(slice);

    // Draw logo on this slice (if provided)
    if (logo) {
      this.drawLogoOnSlice(slice, logo);
    }

    // Draw GIF on this slice (if provided)
    if (gif) {
      this.drawGifOnSlice(slice, gif);
    }

    // Draw slice labels
    this.drawSliceLabels(slice);
  }

  /**
   * TEMPLATE 1: Classic Broadcast
   * Professional broadcast test pattern with SMPTE-style grid and safe zones
   */
  private drawClassicBroadcast(slice: SliceData, config: TemplateConfig) {
    const { x, y, width, height } = slice;
    const gridSize = config.gridSize;

    // Fine grid with major/minor lines
    this.ctx.strokeStyle = '#00FF00';
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let gx = 0; gx <= width; gx += gridSize) {
      const isMajor = gx % (gridSize * 4) === 0;
      this.ctx.globalAlpha = isMajor ? 0.8 : 0.25;
      this.ctx.lineWidth = isMajor ? 2 : 1;
      this.ctx.beginPath();
      this.ctx.moveTo(x + gx, y);
      this.ctx.lineTo(x + gx, y + height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let gy = 0; gy <= height; gy += gridSize) {
      const isMajor = gy % (gridSize * 4) === 0;
      this.ctx.globalAlpha = isMajor ? 0.8 : 0.25;
      this.ctx.lineWidth = isMajor ? 2 : 1;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y + gy);
      this.ctx.lineTo(x + width, y + gy);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;

    // Center crosshair (broadcast red)
    this.drawCenterCrosshair(slice, '#FF0000', 0.12);

    // Corner markers (broadcast style)
    this.drawCornerMarkers(slice, '#00FFFF');

    // Safe zones (action safe / title safe)
    const actionSafe = Math.min(width, height) * 0.05;
    const titleSafe = Math.min(width, height) * 0.1;

    this.ctx.strokeStyle = '#FFFF00';
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.4;
    this.ctx.setLineDash([8, 4]);
    this.ctx.strokeRect(x + actionSafe, y + actionSafe, width - actionSafe * 2, height - actionSafe * 2);
    this.ctx.globalAlpha = 0.25;
    this.ctx.setLineDash([4, 8]);
    this.ctx.strokeRect(x + titleSafe, y + titleSafe, width - titleSafe * 2, height - titleSafe * 2);
    this.ctx.setLineDash([]);
    this.ctx.globalAlpha = 1;
  }

  /**
   * TEMPLATE 2: LED Panel Pro
   * Precise pixel grid for LED panel alignment with cell numbering
   */
  private drawLEDPanelPro(slice: SliceData, config: TemplateConfig) {
    const { x, y, width, height } = slice;
    const cellSize = config.gridSize;

    const cols = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);

    // Draw grid with LED panel aesthetic
    this.ctx.strokeStyle = '#00CCFF';
    this.ctx.lineWidth = 1.5;
    this.ctx.globalAlpha = 0.6;

    // Vertical lines
    for (let gx = 0; gx <= width; gx += cellSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + gx, y);
      this.ctx.lineTo(x + gx, y + height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let gy = 0; gy <= height; gy += cellSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y + gy);
      this.ctx.lineTo(x + width, y + gy);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;

    // Cell numbering
    const fontSize = Math.min(cellSize / 5, 14);
    this.ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#00CCFF';
    this.ctx.globalAlpha = 0.7;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellX = x + col * cellSize + cellSize / 2;
        const cellY = y + row * cellSize + cellSize / 2;
        this.ctx.fillText(`${col + 1},${row + 1}`, cellX, cellY);
      }
    }
    this.ctx.globalAlpha = 1;

    // Intersection dots at grid points
    this.ctx.fillStyle = '#FF00FF';
    for (let gy = 0; gy <= height; gy += cellSize) {
      for (let gx = 0; gx <= width; gx += cellSize) {
        this.ctx.beginPath();
        this.ctx.arc(x + gx, y + gy, 2.5, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    }

    // Center crosshair
    this.drawCenterCrosshair(slice, '#FF0066', 0.1);

    // Corner markers
    this.drawCornerMarkers(slice, '#FFFF00');
  }

  /**
   * TEMPLATE 3: Projection Alignment
   * Focus on alignment with concentric circles and convergence markers
   */
  private drawProjectionAlignment(slice: SliceData, config: TemplateConfig) {
    const { x, y, width, height } = slice;
    const gridSize = config.gridSize;

    // Fine alignment grid
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 0.5;
    this.ctx.globalAlpha = 0.2;

    // Vertical lines
    for (let gx = 0; gx <= width; gx += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + gx, y);
      this.ctx.lineTo(x + gx, y + height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let gy = 0; gy <= height; gy += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y + gy);
      this.ctx.lineTo(x + width, y + gy);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;

    // Concentric circles at center for focus
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const maxRadius = Math.min(width, height) * 0.35;

    this.ctx.strokeStyle = '#00FF00';
    this.ctx.lineWidth = 1.5;
    this.ctx.globalAlpha = 0.5;

    for (let i = 1; i <= 5; i++) {
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, (maxRadius / 5) * i, 0, 2 * Math.PI);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;

    // Center crosshair with precision
    this.drawCenterCrosshair(slice, '#FF0000', 0.15);

    // Corner convergence circles
    this.drawCornerConvergenceCircles(slice, '#00FFFF');

    // Edge midpoint markers
    const markerSize = Math.min(width, height) * 0.03;
    this.ctx.strokeStyle = '#FFFF00';
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.7;

    // Top
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - markerSize, y);
    this.ctx.lineTo(centerX + markerSize, y);
    this.ctx.stroke();

    // Bottom
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - markerSize, y + height);
    this.ctx.lineTo(centerX + markerSize, y + height);
    this.ctx.stroke();

    // Left
    this.ctx.beginPath();
    this.ctx.moveTo(x, centerY - markerSize);
    this.ctx.lineTo(x, centerY + markerSize);
    this.ctx.stroke();

    // Right
    this.ctx.beginPath();
    this.ctx.moveTo(x + width, centerY - markerSize);
    this.ctx.lineTo(x + width, centerY + markerSize);
    this.ctx.stroke();

    this.ctx.globalAlpha = 1;
  }

  /**
   * TEMPLATE 4: Minimal Clean
   * Ultra-clean minimal grid for modern aesthetic
   */
  private drawMinimalClean(slice: SliceData, config: TemplateConfig) {
    const { x, y, width, height } = slice;
    const gridSize = config.gridSize;

    // Ultra-minimal grid
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.15;

    // Only draw major lines
    for (let gx = 0; gx <= width; gx += gridSize * 2) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + gx, y);
      this.ctx.lineTo(x + gx, y + height);
      this.ctx.stroke();
    }

    for (let gy = 0; gy <= height; gy += gridSize * 2) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y + gy);
      this.ctx.lineTo(x + width, y + gy);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;

    // Center crosshair (minimal)
    this.drawCenterCrosshair(slice, '#FFFFFF', 0.08);

    // Minimal corner markers
    const markerSize = Math.min(width, height) * 0.04;
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 1.5;
    this.ctx.globalAlpha = 0.4;

    // Top-left
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + markerSize);
    this.ctx.lineTo(x, y);
    this.ctx.lineTo(x + markerSize, y);
    this.ctx.stroke();

    // Top-right
    this.ctx.beginPath();
    this.ctx.moveTo(x + width - markerSize, y);
    this.ctx.lineTo(x + width, y);
    this.ctx.lineTo(x + width, y + markerSize);
    this.ctx.stroke();

    // Bottom-right
    this.ctx.beginPath();
    this.ctx.moveTo(x + width, y + height - markerSize);
    this.ctx.lineTo(x + width, y + height);
    this.ctx.lineTo(x + width - markerSize, y + height);
    this.ctx.stroke();

    // Bottom-left
    this.ctx.beginPath();
    this.ctx.moveTo(x + markerSize, y + height);
    this.ctx.lineTo(x, y + height);
    this.ctx.lineTo(x, y + height - markerSize);
    this.ctx.stroke();

    this.ctx.globalAlpha = 1;
  }

  /**
   * Draw center crosshair
   */
  private drawCenterCrosshair(slice: SliceData, color: string, sizeRatio: number) {
    const { x, y, width, height } = slice;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const crossSize = Math.min(width, height) * sizeRatio;

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2.5;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 8;

    this.ctx.beginPath();
    this.ctx.moveTo(centerX - crossSize, centerY);
    this.ctx.lineTo(centerX + crossSize, centerY);
    this.ctx.moveTo(centerX, centerY - crossSize);
    this.ctx.lineTo(centerX, centerY + crossSize);
    this.ctx.stroke();

    // Inner detail
    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 1;
    const innerSize = crossSize * 0.3;

    this.ctx.beginPath();
    this.ctx.moveTo(centerX - innerSize, centerY);
    this.ctx.lineTo(centerX + innerSize, centerY);
    this.ctx.moveTo(centerX, centerY - innerSize);
    this.ctx.lineTo(centerX, centerY + innerSize);
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Draw corner markers (broadcast L-shapes)
   */
  private drawCornerMarkers(slice: SliceData, color: string) {
    const { x, y, width, height } = slice;
    const markerSize = Math.min(width, height) * 0.04;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.7;

    // Top-left
    this.ctx.beginPath();
    this.ctx.moveTo(x + markerSize, y);
    this.ctx.lineTo(x, y);
    this.ctx.lineTo(x, y + markerSize);
    this.ctx.stroke();

    // Top-right
    this.ctx.beginPath();
    this.ctx.moveTo(x + width - markerSize, y);
    this.ctx.lineTo(x + width, y);
    this.ctx.lineTo(x + width, y + markerSize);
    this.ctx.stroke();

    // Bottom-right
    this.ctx.beginPath();
    this.ctx.moveTo(x + width - markerSize, y + height);
    this.ctx.lineTo(x + width, y + height);
    this.ctx.lineTo(x + width, y + height - markerSize);
    this.ctx.stroke();

    // Bottom-left
    this.ctx.beginPath();
    this.ctx.moveTo(x + markerSize, y + height);
    this.ctx.lineTo(x, y + height);
    this.ctx.lineTo(x, y + height - markerSize);
    this.ctx.stroke();

    this.ctx.globalAlpha = 1;
  }

  /**
   * Draw corner convergence circles (for projection alignment)
   */
  private drawCornerConvergenceCircles(slice: SliceData, color: string) {
    const { x, y, width, height } = slice;
    const circleRadius = Math.min(width, height) * 0.06;
    const offset = circleRadius * 1.5;

    const corners = [
      [x + offset, y + offset],
      [x + width - offset, y + offset],
      [x + width - offset, y + height - offset],
      [x + offset, y + height - offset],
    ];

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.6;

    corners.forEach(([cx, cy]) => {
      // Outer circle
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, circleRadius, 0, 2 * Math.PI);
      this.ctx.stroke();

      // Inner circle
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, circleRadius * 0.5, 0, 2 * Math.PI);
      this.ctx.stroke();

      // Center crosshair
      const crossSize = circleRadius * 0.25;
      this.ctx.beginPath();
      this.ctx.moveTo(cx - crossSize, cy);
      this.ctx.lineTo(cx + crossSize, cy);
      this.ctx.moveTo(cx, cy - crossSize);
      this.ctx.lineTo(cx, cy + crossSize);
      this.ctx.stroke();
    });

    this.ctx.restore();
  }

  /**
   * Draw slice border
   */
  private drawSliceBorder(slice: SliceData) {
    const { x, y, width, height } = slice;

    this.ctx.save();

    // Outer glow
    this.ctx.shadowColor = '#FFFFFF';
    this.ctx.shadowBlur = 8;
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x, y, width, height);

    // Inner accent line
    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = '#00FFFF';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);

    this.ctx.restore();
  }

  /**
   * Draw logo on each slice (top-right corner with background)
   */
  private drawLogoOnSlice(slice: SliceData, logo: HTMLImageElement) {
    const { x, y, width, height } = slice;
    const logoSize = Math.min(width, height) * 0.15; // Slightly larger
    const padding = 15;
    const logoX = x + width - logoSize - padding;
    const logoY = y + padding;

    this.ctx.save();

    // Draw background for logo with vibrant border
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.fillRect(logoX - 8, logoY - 8, logoSize + 16, logoSize + 16);

    // Draw vibrant border (cyan glow)
    this.ctx.strokeStyle = '#00FFFF';
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = '#00FFFF';
    this.ctx.shadowBlur = 8;
    this.ctx.strokeRect(logoX - 8, logoY - 8, logoSize + 16, logoSize + 16);

    // Draw logo
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;
    this.ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);

    // Add "LOGO" label below for visual confirmation
    this.ctx.font = 'bold 10px Arial';
    this.ctx.fillStyle = '#00FFFF';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('LOGO', logoX + logoSize / 2, logoY + logoSize + 10);

    this.ctx.restore();
  }

  /**
   * Draw GIF on each slice (center-top area)
   */
  private drawGifOnSlice(slice: SliceData, gif: HTMLImageElement) {
    const { x, y, width, height } = slice;
    const gifSize = Math.min(width, height) * 0.15;
    const gifX = x + width / 2 - gifSize / 2;
    const gifY = y + 40;

    this.ctx.save();
    this.ctx.globalAlpha = 0.9;
    this.ctx.drawImage(gif, gifX, gifY, gifSize, gifSize);
    this.ctx.restore();
  }

  /**
   * Draw slice labels (name, dimensions, position)
   */
  private drawSliceLabels(slice: SliceData) {
    const { x, y, width, height, name } = slice;

    this.ctx.save();

    // Top-left position badge
    const tlFontSize = Math.max(10, Math.min(width / 35, 13));
    this.ctx.font = `bold ${tlFontSize}px 'Courier New', monospace`;
    const tlText = `TL: ${x}, ${y}`;
    const tlMetrics = this.ctx.measureText(tlText);
    const tlPadding = 5;

    // Badge background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(x + 8, y + 8, tlMetrics.width + tlPadding * 2, tlFontSize + tlPadding);

    // Badge border
    this.ctx.strokeStyle = '#00FFFF';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x + 8, y + 8, tlMetrics.width + tlPadding * 2, tlFontSize + tlPadding);

    // Text
    this.ctx.fillStyle = '#00FFFF';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(tlText, x + 8 + tlPadding, y + 8 + tlPadding / 2);

    // Center: Slice name
    const centerY = y + height / 2;
    const nameFontSize = Math.max(20, Math.min(width / 12, 40));
    this.ctx.font = `bold ${nameFontSize}px 'Arial', sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Name with glow
    this.ctx.shadowColor = '#FFFF00';
    this.ctx.shadowBlur = 15;
    this.ctx.fillStyle = '#FFFF00';
    this.ctx.fillText(name.toUpperCase(), x + width / 2, centerY - 20);

    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(name.toUpperCase(), x + width / 2, centerY - 20);

    // Dimensions below name
    const dimFontSize = Math.max(12, Math.min(width / 25, 18));
    this.ctx.font = `bold ${dimFontSize}px 'Courier New', monospace`;
    const dimText = `${width} × ${height}`;
    const dimMetrics = this.ctx.measureText(dimText);
    const dimPadding = 6;

    // Dimension badge background
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.fillRect(
      x + width / 2 - dimMetrics.width / 2 - dimPadding,
      centerY + 10,
      dimMetrics.width + dimPadding * 2,
      dimFontSize + dimPadding
    );

    // Dimension text
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    this.ctx.shadowBlur = 3;
    this.ctx.fillText(dimText, x + width / 2, centerY + 10 + dimFontSize / 2 + dimPadding / 2);

    this.ctx.restore();
  }
}

export const patternGenerator = new TestPatternGenerator();
