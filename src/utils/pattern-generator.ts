import { PatternConfig, SliceData } from '../types';

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
   * Generate pattern for a specific slice
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
