import { PatternConfig, SliceData } from '../types';
import { compositePatternGenerator } from './composite-pattern-generator';

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
   */
  generateComposition(
    slices: SliceData[], 
    compositionWidth: number, 
    compositionHeight: number,
    config: PatternConfig,
    sliceColors: Map<string, string>,
    logo?: HTMLImageElement,
    brandName?: string
  ): HTMLCanvasElement {
    // Create canvas at composition size
    this.canvas.width = compositionWidth;
    this.canvas.height = compositionHeight;
    
    // Black background
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, compositionWidth, compositionHeight);

    // Use composite generator for new pattern types
    const compositeTypes = ['complete-pro', 'minimal-geometric', 'gradient-paradise', 
                           'glassmorphic', 'retro-future', 'neo-brutalism'];
    
    if (compositeTypes.includes(config.type)) {
      // Use advanced composite generator
      compositePatternGenerator.setCanvas(this.canvas);
      slices.forEach(slice => {
        const sliceColor = sliceColors.get(slice.id) || config.backgroundColor;
        compositePatternGenerator.generateInSlice(slice, config, sliceColor);
      });
    } else {
      // Use legacy generator for classic patterns
      slices.forEach(slice => {
        const sliceColor = sliceColors.get(slice.id) || config.backgroundColor;
        this.drawSliceInComposition(slice, config, sliceColor);
      });
    }

    // Draw central logo if provided
    if (logo && brandName) {
      this.drawCentralBranding(logo, brandName, compositionWidth, compositionHeight);
    }

    // Draw global overlay grid (optional)
    if (config.showDiagonal) {
      this.drawGlobalOverlay(compositionWidth, compositionHeight, config);
    }

    return this.canvas;
  }

  /**
   * Draw a single slice within the composition
   */
  private drawSliceInComposition(slice: SliceData, config: PatternConfig, sliceColor: string) {
    const { x, y, width, height } = slice;

    // Save context
    this.ctx.save();
    
    // Clip to slice area
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    this.ctx.clip();

    // Fill with slice color
    this.ctx.fillStyle = sliceColor;
    this.ctx.fillRect(x, y, width, height);

    // Draw pattern elements based on type
    switch (config.type) {
      case 'pixel-grid':
        this.drawPixelGridInSlice(slice, config);
        break;
      case 'crosshatch':
        this.drawCrosshatchInSlice(slice, config);
        break;
      case 'resolume':
      default:
        this.drawResolumeInSlice(slice, config);
        break;
    }

    // Restore context
    this.ctx.restore();

    // Enhanced slice border with double-line effect
    this.ctx.save();

    // Outer border with glow
    this.ctx.shadowColor = '#FFFFFF';
    this.ctx.shadowBlur = 10;
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(x, y, width, height);

    // Inner border (accent)
    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = '#00FFFF';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x + 3, y + 3, width - 6, height - 6);

    this.ctx.restore();

    // Draw slice label
    if (config.showText) {
      this.drawSliceLabel(slice, config);
    }
  }

  /**
   * Draw pixel grid pattern within a slice (ENHANCED)
   */
  private drawPixelGridInSlice(slice: SliceData, config: PatternConfig) {
    const { x, y, width, height } = slice;
    const cellSize = config.gridSize || 96;

    const cols = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);

    // Enhanced color palette with better contrast and aesthetics
    const cellColors = [
      '#2E1A47', // Deep Purple
      '#1A3A3A', // Deep Teal
      '#3A3A1A', // Olive Green
      '#3A1A1A', // Dark Crimson
      '#1A1A3A', // Navy Blue
      '#1A3A1A', // Forest Green
    ];

    // Gradient overlay colors for depth
    const gradientOverlays = [
      'rgba(138, 43, 226, 0.15)',   // Purple overlay
      'rgba(0, 206, 209, 0.15)',    // Cyan overlay
      'rgba(154, 205, 50, 0.15)',   // Yellow-green overlay
      'rgba(220, 20, 60, 0.15)',    // Crimson overlay
      'rgba(65, 105, 225, 0.15)',   // Royal blue overlay
      'rgba(46, 139, 87, 0.15)',    // Sea green overlay
    ];

    // Fill cells with subtle gradient effect
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellX = x + col * cellSize;
        const cellY = y + row * cellSize;
        const cellWidth = Math.min(cellSize, width - col * cellSize);
        const cellHeight = Math.min(cellSize, height - row * cellSize);

        // Base color
        const colorIndex = (row * cols + col) % cellColors.length;
        this.ctx.fillStyle = cellColors[colorIndex];
        this.ctx.fillRect(cellX, cellY, cellWidth, cellHeight);

        // Add subtle gradient overlay for depth
        const gradient = this.ctx.createLinearGradient(cellX, cellY, cellX + cellWidth, cellY + cellHeight);
        gradient.addColorStop(0, gradientOverlays[colorIndex]);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(cellX, cellY, cellWidth, cellHeight);
      }
    }

    // Enhanced grid lines with glow effect
    this.ctx.save();
    this.ctx.shadowColor = config.gridColor;
    this.ctx.shadowBlur = 8;
    this.ctx.strokeStyle = config.gridColor;
    this.ctx.lineWidth = 2.5;

    // Vertical lines
    for (let gridX = 0; gridX <= width; gridX += cellSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + gridX, y);
      this.ctx.lineTo(x + gridX, y + height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let gridY = 0; gridY <= height; gridY += cellSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y + gridY);
      this.ctx.lineTo(x + width, y + gridY);
      this.ctx.stroke();
    }
    this.ctx.restore();

    // Draw cell numbers with enhanced styling
    const fontSize = Math.min(cellSize / 4.5, 20);
    this.ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellCenterX = x + col * cellSize + cellSize / 2;
        const cellCenterY = y + row * cellSize + cellSize / 2;

        // Draw number with glow effect
        this.ctx.save();
        this.ctx.shadowColor = '#FFFFFF';
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(`${col + 1},${row + 1}`, cellCenterX, cellCenterY);

        // Second pass for stronger text
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(`${col + 1},${row + 1}`, cellCenterX, cellCenterY);
        this.ctx.restore();

        // Add small corner markers for precise alignment
        const markerSize = cellSize * 0.08;
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.fillRect(x + col * cellSize + 2, y + row * cellSize + 2, markerSize, markerSize);
      }
    }

    // Add LED panel reference dots at intersection points
    this.ctx.fillStyle = '#00FFFF';
    for (let gridY = 0; gridY <= height; gridY += cellSize) {
      for (let gridX = 0; gridX <= width; gridX += cellSize) {
        this.ctx.beginPath();
        this.ctx.arc(x + gridX, y + gridY, 3, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    }
  }

  /**
   * Draw crosshatch pattern within a slice (ENHANCED)
   */
  private drawCrosshatchInSlice(slice: SliceData, config: PatternConfig) {
    const { x, y, width, height } = slice;
    const gridSize = config.gridSize || 50;

    // Fine grid with varying opacity
    for (let gridX = 0; gridX <= width; gridX += gridSize) {
      const isMajorLine = gridX % (gridSize * 4) === 0;
      this.ctx.strokeStyle = config.gridColor;
      this.ctx.lineWidth = isMajorLine ? 2 : 1;
      this.ctx.globalAlpha = isMajorLine ? 0.7 : 0.3;

      this.ctx.beginPath();
      this.ctx.moveTo(x + gridX, y);
      this.ctx.lineTo(x + gridX, y + height);
      this.ctx.stroke();
    }

    for (let gridY = 0; gridY <= height; gridY += gridSize) {
      const isMajorLine = gridY % (gridSize * 4) === 0;
      this.ctx.strokeStyle = config.gridColor;
      this.ctx.lineWidth = isMajorLine ? 2 : 1;
      this.ctx.globalAlpha = isMajorLine ? 0.7 : 0.3;

      this.ctx.beginPath();
      this.ctx.moveTo(x, y + gridY);
      this.ctx.lineTo(x + width, y + gridY);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;

    // Enhanced corner circles for convergence testing
    const circleRadius = Math.min(width, height) * 0.08;

    [[x + circleRadius * 1.5, y + circleRadius * 1.5],
     [x + width - circleRadius * 1.5, y + circleRadius * 1.5],
     [x + width - circleRadius * 1.5, y + height - circleRadius * 1.5],
     [x + circleRadius * 1.5, y + height - circleRadius * 1.5]].forEach(([cx, cy]) => {
      // Outer circle with glow
      this.ctx.save();
      this.ctx.shadowColor = '#FF00FF';
      this.ctx.shadowBlur = 10;
      this.ctx.strokeStyle = '#FF00FF';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, circleRadius, 0, 2 * Math.PI);
      this.ctx.stroke();

      // Middle circle
      this.ctx.shadowBlur = 0;
      this.ctx.strokeStyle = '#00FFFF';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, circleRadius * 0.6, 0, 2 * Math.PI);
      this.ctx.stroke();

      // Center crosshair
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 1;
      const crossSize = circleRadius * 0.3;
      this.ctx.beginPath();
      this.ctx.moveTo(cx - crossSize, cy);
      this.ctx.lineTo(cx + crossSize, cy);
      this.ctx.moveTo(cx, cy - crossSize);
      this.ctx.lineTo(cx, cy + crossSize);
      this.ctx.stroke();
      this.ctx.restore();
    });

    // Center target for focus
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    this.ctx.save();
    this.ctx.shadowColor = '#FFFF00';
    this.ctx.shadowBlur = 15;
    this.ctx.strokeStyle = '#FFFF00';
    this.ctx.lineWidth = 2;

    // Concentric circles
    for (let i = 1; i <= 3; i++) {
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, circleRadius * i * 0.4, 0, 2 * Math.PI);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  /**
   * Draw Resolume-style pattern within a slice (ENHANCED)
   */
  private drawResolumeInSlice(slice: SliceData, config: PatternConfig) {
    const { x, y, width, height } = slice;
    const gridSize = Math.max(30, Math.min(width, height) / 16);

    // Enhanced grid with better visual hierarchy
    this.ctx.lineWidth = 1;

    // Main grid lines (bright, every 4th line)
    for (let gridX = 0; gridX <= width; gridX += gridSize) {
      if (gridX % (gridSize * 4) === 0) {
        this.ctx.strokeStyle = config.gridColor;
        this.ctx.globalAlpha = 0.9;
        this.ctx.lineWidth = 2;
      } else {
        this.ctx.strokeStyle = config.gridColor;
        this.ctx.globalAlpha = 0.25;
        this.ctx.lineWidth = 1;
      }
      this.ctx.beginPath();
      this.ctx.moveTo(x + gridX, y);
      this.ctx.lineTo(x + gridX, y + height);
      this.ctx.stroke();
    }

    for (let gridY = 0; gridY <= height; gridY += gridSize) {
      if (gridY % (gridSize * 4) === 0) {
        this.ctx.strokeStyle = config.gridColor;
        this.ctx.globalAlpha = 0.9;
        this.ctx.lineWidth = 2;
      } else {
        this.ctx.strokeStyle = config.gridColor;
        this.ctx.globalAlpha = 0.25;
        this.ctx.lineWidth = 1;
      }
      this.ctx.beginPath();
      this.ctx.moveTo(x, y + gridY);
      this.ctx.lineTo(x + width, y + gridY);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;

    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const crossSize = Math.min(width, height) * 0.12;

    // Center crosshair with glow effect
    this.ctx.save();
    this.ctx.shadowColor = '#FF0000';
    this.ctx.shadowBlur = 15;
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - crossSize, centerY);
    this.ctx.lineTo(centerX + crossSize, centerY);
    this.ctx.moveTo(centerX, centerY - crossSize);
    this.ctx.lineTo(centerX, centerY + crossSize);
    this.ctx.stroke();

    // Inner crosshair detail
    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 1;
    const innerCross = crossSize * 0.3;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - innerCross, centerY);
    this.ctx.lineTo(centerX + innerCross, centerY);
    this.ctx.moveTo(centerX, centerY - innerCross);
    this.ctx.lineTo(centerX, centerY + innerCross);
    this.ctx.stroke();
    this.ctx.restore();

    // Corner alignment markers (professional broadcast style)
    const markerSize = Math.min(width, height) * 0.05;
    const offset = markerSize * 1.5;
    this.ctx.strokeStyle = '#00FFFF';
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.8;

    // Top-left
    this.ctx.beginPath();
    this.ctx.moveTo(x + offset, y);
    this.ctx.lineTo(x, y);
    this.ctx.lineTo(x, y + offset);
    this.ctx.stroke();

    // Top-right
    this.ctx.beginPath();
    this.ctx.moveTo(x + width - offset, y);
    this.ctx.lineTo(x + width, y);
    this.ctx.lineTo(x + width, y + offset);
    this.ctx.stroke();

    // Bottom-right
    this.ctx.beginPath();
    this.ctx.moveTo(x + width - offset, y + height);
    this.ctx.lineTo(x + width, y + height);
    this.ctx.lineTo(x + width, y + height - offset);
    this.ctx.stroke();

    // Bottom-left
    this.ctx.beginPath();
    this.ctx.moveTo(x + offset, y + height);
    this.ctx.lineTo(x, y + height);
    this.ctx.lineTo(x, y + height - offset);
    this.ctx.stroke();

    this.ctx.globalAlpha = 1;

    // Diagonal lines with gradient effect
    if (config.showDiagonal) {
      this.ctx.save();
      this.ctx.strokeStyle = '#00FF00';
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = 0.4;
      this.ctx.setLineDash([10, 10]);

      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + width, y + height);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(x + width, y);
      this.ctx.lineTo(x, y + height);
      this.ctx.stroke();

      this.ctx.setLineDash([]);
      this.ctx.restore();
    }

    // Safe area indicator (action safe / title safe zones)
    const safeMargin = Math.min(width, height) * 0.05;
    this.ctx.strokeStyle = '#FFFF00';
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.3;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(x + safeMargin, y + safeMargin, width - safeMargin * 2, height - safeMargin * 2);
    this.ctx.setLineDash([]);
    this.ctx.globalAlpha = 1;
  }

  /**
   * Draw slice label (name, dimensions, position) - ENHANCED
   */
  private drawSliceLabel(slice: SliceData, config: PatternConfig) {
    const { x, y, width, height, name } = slice;

    this.ctx.save();

    // TL position label (top-left corner) with background badge
    const tlFontSize = Math.max(10, Math.min(width / 35, 14));
    this.ctx.font = `bold ${tlFontSize}px 'Courier New', monospace`;
    const tlText = `TL: ${x}, ${y}`;
    const tlMetrics = this.ctx.measureText(tlText);
    const tlPadding = 6;

    // Badge background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(
      x + 8,
      y + 8,
      tlMetrics.width + tlPadding * 2,
      tlFontSize + tlPadding
    );

    // Badge border
    this.ctx.strokeStyle = '#00FFFF';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(
      x + 8,
      y + 8,
      tlMetrics.width + tlPadding * 2,
      tlFontSize + tlPadding
    );

    // TL text
    this.ctx.fillStyle = '#00FFFF';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(tlText, x + 8 + tlPadding, y + 8 + tlPadding / 2);

    // Slice name (center) with enhanced styling
    const centerY = y + height / 2;
    const nameFontSize = Math.max(24, Math.min(width / 10, 48));
    this.ctx.font = `bold ${nameFontSize}px 'Arial Black', Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Name with double glow effect
    this.ctx.save();
    this.ctx.shadowColor = '#FFFF00';
    this.ctx.shadowBlur = 20;
    this.ctx.fillStyle = '#FFFF00';
    this.ctx.fillText(name.toUpperCase(), x + width / 2, centerY - 20);

    this.ctx.shadowBlur = 5;
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(name.toUpperCase(), x + width / 2, centerY - 20);
    this.ctx.restore();

    // Dimensions below name with icon-style background
    const dimFontSize = Math.max(14, Math.min(width / 22, 20));
    this.ctx.font = `bold ${dimFontSize}px 'Courier New', monospace`;
    const dimText = `${width} × ${height}`;
    const dimMetrics = this.ctx.measureText(dimText);
    const dimPadding = 8;

    // Dimension badge background
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.fillRect(
      x + width / 2 - dimMetrics.width / 2 - dimPadding,
      centerY + 10,
      dimMetrics.width + dimPadding * 2,
      dimFontSize + dimPadding
    );

    // Dimension text
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    this.ctx.shadowBlur = 4;
    this.ctx.fillText(dimText, x + width / 2, centerY + 10 + dimFontSize / 2 + dimPadding / 2);

    // Bottom-right corner: Add slice index/number badge
    const indexFontSize = Math.max(10, Math.min(width / 40, 12));
    this.ctx.font = `bold ${indexFontSize}px Arial`;
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'bottom';

    const indexText = `#${slice.id.slice(-1)}`;
    const indexMetrics = this.ctx.measureText(indexText);
    const indexPadding = 4;

    // Index badge background
    this.ctx.fillStyle = 'rgba(255, 0, 255, 0.3)';
    this.ctx.fillRect(
      x + width - indexMetrics.width - indexPadding * 2 - 8,
      y + height - indexFontSize - indexPadding - 8,
      indexMetrics.width + indexPadding * 2,
      indexFontSize + indexPadding
    );

    // Index border
    this.ctx.strokeStyle = '#FF00FF';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(
      x + width - indexMetrics.width - indexPadding * 2 - 8,
      y + height - indexFontSize - indexPadding - 8,
      indexMetrics.width + indexPadding * 2,
      indexFontSize + indexPadding
    );

    // Index text
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#FF00FF';
    this.ctx.fillText(
      indexText,
      x + width - indexPadding - 8,
      y + height - indexPadding - 8
    );

    this.ctx.restore();
  }

  /**
   * Draw central logo and branding
   */
  private drawCentralBranding(logo: HTMLImageElement, brandName: string, width: number, height: number) {
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Draw logo
    const logoSize = Math.min(width, height) * 0.15;
    this.ctx.drawImage(
      logo,
      centerX - logoSize / 2,
      centerY - logoSize / 2,
      logoSize,
      logoSize
    );

    // Draw brand name below logo
    this.ctx.save();
    this.ctx.font = 'bold 48px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    this.ctx.shadowBlur = 8;
    this.ctx.fillText(brandName, centerX, centerY + logoSize / 2 + 20);
    this.ctx.restore();
  }

  /**
   * Draw global overlay (optional)
   */
  private drawGlobalOverlay(width: number, height: number, config: PatternConfig) {
    // Diagonal lines corner to corner
    this.ctx.strokeStyle = config.gridColor;
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.3;
    
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(width, height);
    this.ctx.moveTo(width, 0);
    this.ctx.lineTo(0, height);
    this.ctx.stroke();
    
    this.ctx.globalAlpha = 1;
  }

  /**
   * Generate pattern for a specific slice (legacy method for compatibility)
   */
  generate(slice: SliceData, config: PatternConfig): HTMLCanvasElement {
    this.canvas.width = slice.width;
    this.canvas.height = slice.height;
    this.ctx.clearRect(0, 0, slice.width, slice.height);

    switch (config.type) {
      case 'smpte-75':
        this.drawSMPTE75(slice, config);
        break;
      case 'smpte-100':
        this.drawSMPTE100(slice, config);
        break;
      case 'ebu-75':
        this.drawEBU75(slice, config);
        break;
      case 'crosshatch':
        this.drawCrosshatch(slice, config);
        break;
      case 'monoscope':
        this.drawMonoscope(slice, config);
        break;
      case 'zone-plate':
        this.drawZonePlate(slice, config);
        break;
      case 'gradient-ramp':
        this.drawGradientRamp(slice, config);
        break;
      case 'pixel-grid':
        this.drawPixelGrid(slice, config);
        break;
      case 'resolume':
        this.drawResolumePattern(slice, config);
        break;
    }

    return this.canvas;
  }

  /**
   * SMPTE Color Bars 75% (Standard broadcast)
   */
  private drawSMPTE75(slice: SliceData, config: PatternConfig) {
    const w = slice.width;
    const h = slice.height;
    
    // Top 2/3: Color bars at 75% intensity
    const barHeight = (h * 2) / 3;
    const barWidth = w / 7;
    
    // 75% SMPTE colors (RGB 0-255)
    const colors = [
      [191, 191, 191], // 75% White
      [191, 191, 0],   // Yellow
      [0, 191, 191],   // Cyan
      [0, 191, 0],     // Green
      [191, 0, 191],   // Magenta
      [191, 0, 0],     // Red
      [0, 0, 191],     // Blue
    ];

    // Draw top bars
    colors.forEach((color, i) => {
      this.ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      this.ctx.fillRect(i * barWidth, 0, barWidth, barHeight);
    });

    // Middle section (pluge and color bars)
    const midY = barHeight;
    const midHeight = h / 12;
    
    // Reverse blue bars
    const reverseColors = [
      [0, 0, 191],     // Blue
      [0, 0, 0],       // Black
      [191, 0, 191],   // Magenta
      [0, 0, 0],       // Black
      [0, 191, 191],   // Cyan
      [0, 0, 0],       // Black
      [191, 191, 191], // 75% White
    ];

    reverseColors.forEach((color, i) => {
      this.ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      this.ctx.fillRect(i * barWidth, midY, barWidth, midHeight);
    });

    // Bottom section with -I, White, +Q, Black
    const botY = midY + midHeight;
    const botHeight = h - botY;
    
    // Left section (gradient from -I)
    this.ctx.fillStyle = 'rgb(0, 4, 79)';  // -I
    this.ctx.fillRect(0, botY, barWidth * 1.25, botHeight);
    
    // Middle white
    this.ctx.fillStyle = 'rgb(191, 191, 191)';
    this.ctx.fillRect(barWidth * 1.25, botY, barWidth * 3.5, botHeight);
    
    // +Q
    this.ctx.fillStyle = 'rgb(79, 0, 79)';  // +Q
    this.ctx.fillRect(barWidth * 4.75, botY, barWidth * 0.5, botHeight);
    
    // Black (3.5% super black, 7.5% black, 11.5% grey)
    this.ctx.fillStyle = 'rgb(9, 9, 9)';    // 3.5% super black
    this.ctx.fillRect(barWidth * 5.25, botY, barWidth * 0.5, botHeight);
    
    this.ctx.fillStyle = 'rgb(19, 19, 19)';  // 7.5% black
    this.ctx.fillRect(barWidth * 5.75, botY, barWidth * 0.5, botHeight);
    
    this.ctx.fillStyle = 'rgb(29, 29, 29)';  // 11.5% grey
    this.ctx.fillRect(barWidth * 6.25, botY, barWidth * 0.5, botHeight);
    
    this.ctx.fillStyle = 'rgb(0, 0, 0)';     // Black
    this.ctx.fillRect(barWidth * 6.75, botY, barWidth * 0.25, botHeight);

    // Add slice name if enabled
    if (config.showText) {
      this.drawText(slice.name, w / 2, h / 2, config);
    }
  }

  /**
   * SMPTE Color Bars 100%
   */
  private drawSMPTE100(slice: SliceData, config: PatternConfig) {
    const w = slice.width;
    const h = slice.height;
    const barWidth = w / 8;  // 8 bars including black

    // 100% SMPTE colors
    const colors = [
      [255, 255, 255], // 100% White
      [255, 255, 0],   // Yellow
      [0, 255, 255],   // Cyan
      [0, 255, 0],     // Green
      [255, 0, 255],   // Magenta
      [255, 0, 0],     // Red
      [0, 0, 255],     // Blue
      [0, 0, 0],       // Black
    ];

    colors.forEach((color, i) => {
      this.ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      this.ctx.fillRect(i * barWidth, 0, barWidth, h);
    });

    if (config.showText) {
      this.drawText(slice.name, w / 2, h / 2, config);
    }
  }

  /**
   * EBU Color Bars 75%
   */
  private drawEBU75(slice: SliceData, config: PatternConfig) {
    const w = slice.width;
    const h = slice.height;
    const barWidth = w / 8;  // 8 bars including 100% white and black

    // EBU 75% colors (same as SMPTE 75% but with additional black bar)
    const colors = [
      [255, 255, 255], // 100% White (EBU starts with 100% white)
      [191, 191, 0],   // 75% Yellow
      [0, 191, 191],   // 75% Cyan
      [0, 191, 0],     // 75% Green
      [191, 0, 191],   // 75% Magenta
      [191, 0, 0],     // 75% Red
      [0, 0, 191],     // 75% Blue
      [0, 0, 0],       // Black
    ];

    colors.forEach((color, i) => {
      this.ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      this.ctx.fillRect(i * barWidth, 0, barWidth, h);
    });

    if (config.showText) {
      this.drawText(slice.name, w / 2, h / 2, config);
    }
  }

  /**
   * Crosshatch pattern for convergence testing
   */
  private drawCrosshatch(slice: SliceData, config: PatternConfig) {
    const w = slice.width;
    const h = slice.height;

    // Background
    this.ctx.fillStyle = config.backgroundColor;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.strokeStyle = config.gridColor;
    this.ctx.lineWidth = 2;

    // Grid spacing (responsive based on size)
    const gridSize = config.gridSize || Math.max(50, Math.min(w, h) / 20);

    // Vertical lines
    for (let x = 0; x <= w; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= h; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
      this.ctx.stroke();
    }

    // Corner circles for convergence
    const circleRadius = Math.min(w, h) * 0.05;
    this.ctx.lineWidth = 3;
    
    [[0, 0], [w, 0], [w, h], [0, h]].forEach(([cx, cy]) => {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, circleRadius, 0, 2 * Math.PI);
      this.ctx.stroke();
    });

    // Center circle
    this.ctx.beginPath();
    this.ctx.arc(w / 2, h / 2, circleRadius, 0, 2 * Math.PI);
    this.ctx.stroke();

    if (config.showText) {
      this.drawText(slice.name, w / 2, 40, config);
    }
  }

  /**
   * Monoscope - Complete test pattern with circles, grid, and convergence elements
   */
  private drawMonoscope(slice: SliceData, config: PatternConfig) {
    const w = slice.width;
    const h = slice.height;

    // Background
    this.ctx.fillStyle = config.backgroundColor;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.strokeStyle = config.gridColor;
    this.ctx.lineWidth = 1;

    // Fine grid
    const gridSize = Math.max(20, Math.min(w, h) / 40);
    for (let x = 0; x <= w; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
      this.ctx.stroke();
    }
    for (let y = 0; y <= h; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
      this.ctx.stroke();
    }

    // Concentric circles at center
    this.ctx.lineWidth = 2;
    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.min(w, h) * 0.4;
    
    for (let r = maxRadius / 8; r <= maxRadius; r += maxRadius / 8) {
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
      this.ctx.stroke();
    }

    // Corner circles for static convergence
    const cornerRadius = Math.min(w, h) * 0.08;
    this.ctx.lineWidth = 3;
    const cornerOffset = cornerRadius + 10;
    
    [[cornerOffset, cornerOffset], 
     [w - cornerOffset, cornerOffset],
     [w - cornerOffset, h - cornerOffset],
     [cornerOffset, h - cornerOffset]].forEach(([cx, cy]) => {
      // Outer circle
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, cornerRadius, 0, 2 * Math.PI);
      this.ctx.stroke();
      
      // Inner crosshair
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(cx - cornerRadius / 2, cy);
      this.ctx.lineTo(cx + cornerRadius / 2, cy);
      this.ctx.moveTo(cx, cy - cornerRadius / 2);
      this.ctx.lineTo(cx, cy + cornerRadius / 2);
      this.ctx.stroke();
      this.ctx.lineWidth = 3;
    });

    // Red squares for aspect ratio testing
    const squareSize = Math.min(w, h) * 0.08;
    this.ctx.fillStyle = '#FF0000';
    this.ctx.fillRect(centerX - squareSize / 2, centerY - squareSize / 2, squareSize, squareSize);

    // Aspect ratio markers on edges
    this.ctx.fillRect(centerX - squareSize / 2, 20, squareSize, squareSize);
    this.ctx.fillRect(centerX - squareSize / 2, h - 20 - squareSize, squareSize, squareSize);
    this.ctx.fillRect(20, centerY - squareSize / 2, squareSize, squareSize);
    this.ctx.fillRect(w - 20 - squareSize, centerY - squareSize / 2, squareSize, squareSize);

    if (config.showText) {
      this.drawText(slice.name, w / 2, 40, config);
      // Add resolution info
      this.ctx.font = '16px Arial';
      this.drawText(`${w}x${h}`, w / 2, h - 40, config);
    }
  }

  /**
   * Zone Plate - For testing focus and resolution (UFO pattern)
   */
  private drawZonePlate(slice: SliceData, config: PatternConfig) {
    const w = slice.width;
    const h = slice.height;

    // Background
    this.ctx.fillStyle = config.backgroundColor;
    this.ctx.fillRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.min(w, h) * 0.45;

    // Create zone plate pattern
    const imageData = this.ctx.createImageData(w, h);
    const data = imageData.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distSq = dx * dx + dy * dy;
        const freq = distSq / (maxRadius * maxRadius) * 40;
        const value = (Math.sin(freq * Math.PI) + 1) * 127.5;
        
        const idx = (y * w + x) * 4;
        data[idx] = value;     // R
        data[idx + 1] = value; // G
        data[idx + 2] = value; // B
        data[idx + 3] = 255;   // A
      }
    }

    this.ctx.putImageData(imageData, 0, 0);

    // Add concentric circles overlay
    this.ctx.strokeStyle = config.gridColor;
    this.ctx.lineWidth = 1;
    for (let r = maxRadius / 10; r <= maxRadius; r += maxRadius / 10) {
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
      this.ctx.stroke();
    }

    if (config.showText) {
      this.drawText('FOCUS / RESOLUTION TEST', w / 2, 40, config);
      this.drawText(slice.name, w / 2, h - 40, config);
    }
  }

  /**
   * Gradient Ramp - For testing luminance and gamma
   */
  private drawGradientRamp(slice: SliceData, config: PatternConfig) {
    const w = slice.width;
    const h = slice.height;

    // Horizontal gradient (0% to 100%)
    const gradient = this.ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(1, '#FFFFFF');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h * 0.4);

    // RGB gradients
    const rgbHeight = h * 0.15;
    
    // Red gradient
    const redGrad = this.ctx.createLinearGradient(0, 0, w, 0);
    redGrad.addColorStop(0, '#000000');
    redGrad.addColorStop(1, '#FF0000');
    this.ctx.fillStyle = redGrad;
    this.ctx.fillRect(0, h * 0.4, w, rgbHeight);

    // Green gradient
    const greenGrad = this.ctx.createLinearGradient(0, 0, w, 0);
    greenGrad.addColorStop(0, '#000000');
    greenGrad.addColorStop(1, '#00FF00');
    this.ctx.fillStyle = greenGrad;
    this.ctx.fillRect(0, h * 0.4 + rgbHeight, w, rgbHeight);

    // Blue gradient
    const blueGrad = this.ctx.createLinearGradient(0, 0, w, 0);
    blueGrad.addColorStop(0, '#000000');
    blueGrad.addColorStop(1, '#0000FF');
    this.ctx.fillStyle = blueGrad;
    this.ctx.fillRect(0, h * 0.4 + rgbHeight * 2, w, rgbHeight);

    // Step wedge (bottom)
    const stepCount = 16;
    const stepWidth = w / stepCount;
    const stepY = h * 0.85;
    const stepHeight = h * 0.15;

    for (let i = 0; i < stepCount; i++) {
      const gray = Math.floor((i / (stepCount - 1)) * 255);
      this.ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      this.ctx.fillRect(i * stepWidth, stepY, stepWidth, stepHeight);
    }

    if (config.showText) {
      this.drawText('LUMINANCE CALIBRATION', w / 2, h * 0.2, config);
      this.drawText(slice.name, w / 2, h * 0.75, config);
    }
  }

  /**
   * Pixel Grid - LED panel numbering and alignment
   */
  private drawPixelGrid(slice: SliceData, config: PatternConfig) {
    const w = slice.width;
    const h = slice.height;

    // Background
    this.ctx.fillStyle = config.backgroundColor;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.strokeStyle = config.gridColor;
    this.ctx.lineWidth = 1;

    // Grid based on config
    const cellSize = config.gridSize || 96;  // Default 96px (common LED panel size)
    const cols = Math.ceil(w / cellSize);
    const rows = Math.ceil(h / cellSize);

    // Draw grid
    for (let x = 0; x <= w; x += cellSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
      this.ctx.stroke();
    }
    for (let y = 0; y <= h; y += cellSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
      this.ctx.stroke();
    }

    // Add cell numbers
    this.ctx.fillStyle = config.textColor;
    this.ctx.font = `${Math.min(cellSize / 4, 16)}px monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;
        const cellNum = row * cols + col + 1;
        
        this.ctx.fillText(`${cellNum}`, x, y - cellSize / 6);
        this.ctx.font = `${Math.min(cellSize / 6, 12)}px monospace`;
        this.ctx.fillText(`${col},${row}`, x, y + cellSize / 6);
        this.ctx.font = `${Math.min(cellSize / 4, 16)}px monospace`;
      }
    }

    // Corner markers
    const markerSize = 20;
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.lineWidth = 3;
    
    [[0, 0], [w, 0], [w, h], [0, h]].forEach(([x, y]) => {
      this.ctx.beginPath();
      if (x === 0) {
        this.ctx.moveTo(x, y === 0 ? y : y - markerSize);
        this.ctx.lineTo(x, y === 0 ? y + markerSize : y);
        this.ctx.lineTo(markerSize, y);
      } else {
        this.ctx.moveTo(x, y === 0 ? y : y - markerSize);
        this.ctx.lineTo(x, y === 0 ? y + markerSize : y);
        this.ctx.lineTo(x - markerSize, y);
      }
      this.ctx.stroke();
    });

    if (config.showText) {
      this.ctx.font = 'bold 24px Arial';
      this.drawText(slice.name, w / 2, 30, config);
      this.ctx.font = '16px Arial';
      this.drawText(`${w}x${h} | ${cols}x${rows} cells`, w / 2, 60, config);
    }
  }

  /**
   * Resolume-style pattern (similar to their default test pattern)
   */
  private drawResolumePattern(slice: SliceData, config: PatternConfig) {
    const w = slice.width;
    const h = slice.height;

    // Background
    this.ctx.fillStyle = config.backgroundColor;
    this.ctx.fillRect(0, 0, w, h);

    // Grid
    this.ctx.strokeStyle = config.gridColor;
    this.ctx.lineWidth = 2;
    
    const gridSize = Math.max(50, Math.min(w, h) / 16);
    
    // Bold grid lines
    for (let x = 0; x <= w; x += gridSize) {
      this.ctx.globalAlpha = (x % (gridSize * 4) === 0) ? 1 : 0.3;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
      this.ctx.stroke();
    }
    for (let y = 0; y <= h; y += gridSize) {
      this.ctx.globalAlpha = (y % (gridSize * 4) === 0) ? 1 : 0.3;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;

    // Diagonal line (animated reference)
    if (config.showDiagonal) {
      this.ctx.strokeStyle = '#00FF00';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(w, h);
      this.ctx.stroke();
    }

    // Center cross
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.lineWidth = 3;
    const crossSize = Math.min(w, h) * 0.1;
    this.ctx.beginPath();
    this.ctx.moveTo(w / 2 - crossSize, h / 2);
    this.ctx.lineTo(w / 2 + crossSize, h / 2);
    this.ctx.moveTo(w / 2, h / 2 - crossSize);
    this.ctx.lineTo(w / 2, h / 2 + crossSize);
    this.ctx.stroke();

    // Corner UFOs (optional)
    if (config.showUFO) {
      const ufoRadius = Math.min(w, h) * 0.04;
      this.ctx.fillStyle = '#FF00FF';
      
      [[ufoRadius + 10, ufoRadius + 10],
       [w - ufoRadius - 10, ufoRadius + 10],
       [w - ufoRadius - 10, h - ufoRadius - 10],
       [ufoRadius + 10, h - ufoRadius - 10]].forEach(([x, y]) => {
        this.ctx.beginPath();
        this.ctx.arc(x, y, ufoRadius, 0, 2 * Math.PI);
        this.ctx.fill();
      });
    }

    // Slice info
    if (config.showText) {
      this.ctx.font = 'bold 32px Arial';
      this.drawText(slice.name, w / 2, h / 2 - 40, config);
      
      this.ctx.font = 'bold 24px monospace';
      this.drawText(`${w} × ${h}`, w / 2, h / 2 + 10, config);
      
      this.ctx.font = '18px monospace';
      this.drawText(`Position: (${slice.x}, ${slice.y})`, w / 2, h / 2 + 40, config);
    }
  }

  // Helper to draw text
  private drawText(text: string, x: number, y: number, config: PatternConfig) {
    this.ctx.save();
    this.ctx.font = this.ctx.font || `bold ${config.fontSize || 24}px Arial`;
    this.ctx.fillStyle = config.textColor;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Text shadow for better visibility
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    this.ctx.shadowBlur = 4;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;
    
    this.ctx.fillText(text, x, y);
    this.ctx.restore();
  }
}

export const patternGenerator = new TestPatternGenerator();
