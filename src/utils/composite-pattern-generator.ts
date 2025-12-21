import { PatternConfig, SliceData } from '../types';

/**
 * Advanced Pattern Generator v3.0 - Portfolio Quality Composite Layouts
 * Combines multiple test pattern elements into sophisticated compositions
 */
export class CompositePatternGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
  }

  /**
   * Generate composite pattern in slice
   */
  generateInSlice(slice: SliceData, config: PatternConfig, sliceColor: string): void {
    const { x, y, width, height } = slice;

    // Save context
    this.ctx.save();
    
    // Clip to slice area
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    this.ctx.clip();

    // Translate to slice origin for easier drawing
    this.ctx.translate(x, y);

    // Generate pattern based on type
    switch (config.type) {
      case 'complete-pro':
        this.drawCompletePro(width, height, sliceColor, config);
        break;
      case 'minimal-geometric':
        this.drawMinimalGeometric(width, height, sliceColor, config);
        break;
      case 'gradient-paradise':
        this.drawGradientParadise(width, height, sliceColor, config);
        break;
      case 'glassmorphic':
        this.drawGlassmorphic(width, height, sliceColor, config);
        break;
      case 'retro-future':
        this.drawRetroFuture(width, height, sliceColor, config);
        break;
      case 'neo-brutalism':
        this.drawNeoBrutalism(width, height, sliceColor, config);
        break;
      default:
        // Fallback to simple pattern
        this.ctx.fillStyle = sliceColor;
        this.ctx.fillRect(0, 0, width, height);
    }

    // Draw slice label if enabled
    if (config.showText) {
      this.drawSliceInfo(slice, width, height, config);
    }

    // Restore context
    this.ctx.restore();

    // Draw border
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);
  }

  /**
   * LAYOUT 1: Complete Professional
   * All elements combined - SMPTE bars + gradients + grid + circles + zone plate
   */
  private drawCompletePro(width: number, height: number, sliceColor: string, config: PatternConfig): void {
    // 1. Background gradient (multiply blend)
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0A0A0A');
    bgGrad.addColorStop(1, sliceColor);
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, width, height);

    // 2. SMPTE Color Bars (top 15%)
    const barHeight = height * 0.15;
    this.drawSMPTEBars(0, 0, width, barHeight);

    // 3. Crosshatch grid (overlay blend)
    this.ctx.globalAlpha = 0.3;
    this.ctx.globalCompositeOperation = 'overlay';
    this.drawGrid(width, height, config.gridSize || 50, config.gridColor);
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';

    // 4. Convergence circles
    this.ctx.globalAlpha = 0.8;
    this.drawConvergenceCircles(width, height, config.gridColor);
    this.ctx.globalAlpha = 1;

    // 5. Zone Plate (small, top-right corner)
    this.ctx.globalAlpha = 0.4;
    this.ctx.globalCompositeOperation = 'screen';
    const zpSize = Math.min(width, height) * 0.2;
    this.drawZonePlate(width - zpSize - 20, barHeight + 20, zpSize, zpSize);
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';

    // 6. Accent gradient (diagonal, screen blend)
    this.ctx.globalAlpha = 0.3;
    this.ctx.globalCompositeOperation = 'screen';
    const diagGrad = this.ctx.createLinearGradient(0, 0, width, height);
    diagGrad.addColorStop(0, '#00F5FF');
    diagGrad.addColorStop(1, '#FF00FF');
    this.ctx.fillStyle = diagGrad;
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * LAYOUT 2: Minimal Geometric
   * Clean design with circles and elegant typography (Apple/Dieter Rams style)
   */
  private drawMinimalGeometric(width: number, height: number, sliceColor: string, config: PatternConfig): void {
    // 1. Solid background (almost black)
    this.ctx.fillStyle = '#0F0F0F';
    this.ctx.fillRect(0, 0, width, height);

    // 2. Ultra-fine grid (30% opacity, overlay)
    this.ctx.globalAlpha = 0.2;
    this.ctx.globalCompositeOperation = 'overlay';
    this.drawGrid(width, height, config.gridSize || 40, '#FFFFFF');
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';

    // 3. Concentric circles (center)
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.35;
    
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 1;
    
    for (let r = maxRadius; r > 0; r -= maxRadius / 8) {
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // 4. Corner accent (single color)
    this.ctx.fillStyle = config.gridColor || '#00FF9F';
    const cornerSize = 3;
    // Top-left
    this.ctx.fillRect(20, 20, cornerSize, 20);
    this.ctx.fillRect(20, 20, 20, cornerSize);
    // Top-right
    this.ctx.fillRect(width - 40, 20, cornerSize, 20);
    this.ctx.fillRect(width - 40, 20, 20, cornerSize);
    // Bottom-left
    this.ctx.fillRect(20, height - 40, cornerSize, 20);
    this.ctx.fillRect(20, height - 23, 20, cornerSize);
    // Bottom-right
    this.ctx.fillRect(width - 40, height - 40, cornerSize, 20);
    this.ctx.fillRect(width - 40, height - 23, 20, cornerSize);
  }

  /**
   * LAYOUT 3: Gradient Paradise
   * Multiple vibrant gradients with sophisticated blend modes
   */
  private drawGradientParadise(width: number, height: number, sliceColor: string, config: PatternConfig): void {
    // 1. Base gradient (vertical, pink to purple)
    const grad1 = this.ctx.createLinearGradient(0, 0, 0, height);
    grad1.addColorStop(0, '#FF6B9D');
    grad1.addColorStop(1, '#5F27CD');
    this.ctx.fillStyle = grad1;
    this.ctx.fillRect(0, 0, width, height);

    // 2. Second gradient (diagonal, cyan to yellow, screen blend)
    this.ctx.globalAlpha = 0.7;
    this.ctx.globalCompositeOperation = 'screen';
    const grad2 = this.ctx.createLinearGradient(0, 0, width, height);
    grad2.addColorStop(0, '#00D2D3');
    grad2.addColorStop(1, '#FFBE0B');
    this.ctx.fillStyle = grad2;
    this.ctx.fillRect(0, 0, width, height);

    // 3. Third gradient (radial from center, soft-light blend)
    this.ctx.globalAlpha = 0.5;
    this.ctx.globalCompositeOperation = 'soft-light';
    const grad3 = this.ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    grad3.addColorStop(0, '#FF9FF3');
    grad3.addColorStop(1, '#FEA47F');
    this.ctx.fillStyle = grad3;
    this.ctx.fillRect(0, 0, width, height);

    // Reset
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';

    // 4. Subtle grid overlay
    this.ctx.globalAlpha = 0.15;
    this.ctx.globalCompositeOperation = 'overlay';
    this.drawGrid(width, height, 60, '#FFFFFF');
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';

    // 5. Glow effects (corners)
    this.ctx.globalAlpha = 0.6;
    this.ctx.globalCompositeOperation = 'screen';
    const glowSize = Math.min(width, height) * 0.3;
    
    // Top-left glow
    const glow1 = this.ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
    glow1.addColorStop(0, '#FF00FF');
    glow1.addColorStop(1, 'transparent');
    this.ctx.fillStyle = glow1;
    this.ctx.fillRect(0, 0, glowSize, glowSize);

    // Bottom-right glow
    const glow2 = this.ctx.createRadialGradient(width, height, 0, width, height, glowSize);
    glow2.addColorStop(0, '#00FFFF');
    glow2.addColorStop(1, 'transparent');
    this.ctx.fillStyle = glow2;
    this.ctx.fillRect(width - glowSize, height - glowSize, glowSize, glowSize);

    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * LAYOUT 4: Glassmorphic
   * Modern glass effect with blur and transparency
   */
  private drawGlassmorphic(width: number, height: number, sliceColor: string, config: PatternConfig): void {
    // 1. Soft gradient background
    const bgGrad = this.ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#E0E0FF');
    bgGrad.addColorStop(1, '#FFE0FF');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, width, height);

    // 2. Grid overlay (very subtle)
    this.ctx.globalAlpha = 0.15;
    this.ctx.globalCompositeOperation = 'overlay';
    this.drawGrid(width, height, 40, '#FFFFFF');
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';

    // 3. Glass panels (frosted effect simulation)
    const panelW = width * 0.6;
    const panelH = height * 0.5;
    const panelX = (width - panelW) / 2;
    const panelY = (height - panelH) / 2;

    // Panel background (semi-transparent white)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.fillRect(panelX, panelY, panelW, panelH);

    // Panel border (bright white, slight glow)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    this.ctx.lineWidth = 1;
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    this.ctx.shadowBlur = 4;
    this.ctx.strokeRect(panelX, panelY, panelW, panelH);
    this.ctx.shadowBlur = 0;

    // 4. Circles with glass effect
    this.ctx.globalAlpha = 0.4;
    this.ctx.globalCompositeOperation = 'screen';
    this.drawConvergenceCircles(width, height, '#7B68EE');
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * LAYOUT 5: Retro Future
   * CRT scanlines + phosphor glow + cyberpunk gradients
   */
  private drawRetroFuture(width: number, height: number, sliceColor: string, config: PatternConfig): void {
    // 1. Dark background with gradient (violet to dark cyan)
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0A000A');
    bgGrad.addColorStop(1, '#001A1A');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, width, height);

    // 2. Cyberpunk gradient overlay (screen blend)
    this.ctx.globalAlpha = 0.4;
    this.ctx.globalCompositeOperation = 'screen';
    const cyberGrad = this.ctx.createLinearGradient(0, 0, width, height);
    cyberGrad.addColorStop(0, '#5F27CD');
    cyberGrad.addColorStop(0.5, '#00D2D3');
    cyberGrad.addColorStop(1, '#FF006E');
    this.ctx.fillStyle = cyberGrad;
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';

    // 3. Scanlines (CRT effect)
    this.ctx.globalAlpha = 0.1;
    this.ctx.fillStyle = '#000000';
    for (let y = 0; y < height; y += 3) {
      this.ctx.fillRect(0, y, width, 1);
    }
    this.ctx.globalAlpha = 1;

    // 4. Neon grid with glow
    this.ctx.strokeStyle = '#00FFFF';
    this.ctx.lineWidth = 1;
    this.ctx.shadowColor = '#00FFFF';
    this.ctx.shadowBlur = 8;
    this.drawGrid(width, height, 50, '#00FFFF');
    this.ctx.shadowBlur = 0;

    // 5. Phosphor glow circles
    this.ctx.globalAlpha = 0.6;
    this.ctx.shadowColor = '#00FF00';
    this.ctx.shadowBlur = 15;
    this.drawConvergenceCircles(width, height, '#00FF00');
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;
  }

  /**
   * LAYOUT 6: Neo-Brutalism
   * Bold colors, thick borders, hard shadows
   */
  private drawNeoBrutalism(width: number, height: number, sliceColor: string, config: PatternConfig): void {
    // 1. Saturated color background
    this.ctx.fillStyle = sliceColor;
    this.ctx.fillRect(0, 0, width, height);

    // 2. Thick black grid
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 4;
    this.drawGrid(width, height, 80, '#000000');

    // 3. Geometric shapes with hard shadows
    const shapeSize = Math.min(width, height) * 0.4;
    const shapeX = (width - shapeSize) / 2;
    const shapeY = (height - shapeSize) / 2;

    // Shadow (offset, no blur)
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(shapeX + 10, shapeY + 10, shapeSize, shapeSize);

    // Main shape
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(shapeX, shapeY, shapeSize, shapeSize);

    // Black border
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 6;
    this.ctx.strokeRect(shapeX, shapeY, shapeSize, shapeSize);

    // Corner markers (bold)
    this.ctx.fillStyle = '#000000';
    const markerSize = 20;
    // Top-left
    this.ctx.fillRect(10, 10, markerSize, 6);
    this.ctx.fillRect(10, 10, 6, markerSize);
    // Top-right
    this.ctx.fillRect(width - 30, 10, markerSize, 6);
    this.ctx.fillRect(width - 16, 10, 6, markerSize);
    // Bottom-left
    this.ctx.fillRect(10, height - 30, markerSize, 6);
    this.ctx.fillRect(10, height - 16, 6, markerSize);
    // Bottom-right
    this.ctx.fillRect(width - 30, height - 30, markerSize, 6);
    this.ctx.fillRect(width - 16, height - 16, 6, markerSize);
  }

  /**
   * Helper: Draw SMPTE color bars
   */
  private drawSMPTEBars(x: number, y: number, width: number, height: number): void {
    const colors = [
      '#C0C0C0', // White 75%
      '#C0C000', // Yellow 75%
      '#00C0C0', // Cyan 75%
      '#00C000', // Green 75%
      '#C000C0', // Magenta 75%
      '#C00000', // Red 75%
      '#0000C0', // Blue 75%
    ];

    const barWidth = width / colors.length;
    colors.forEach((color, i) => {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x + i * barWidth, y, barWidth, height);
    });
  }

  /**
   * Helper: Draw grid
   */
  private drawGrid(width: number, height: number, gridSize: number, color: string): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
  }

  /**
   * Helper: Draw convergence circles
   */
  private drawConvergenceCircles(width: number, height: number, color: string): void {
    const radius = Math.min(width, height) * 0.08;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;

    const positions = [
      [radius + 20, radius + 20],
      [width - radius - 20, radius + 20],
      [width - radius - 20, height - radius - 20],
      [radius + 20, height - radius - 20],
      [width / 2, height / 2],
    ];

    positions.forEach(([cx, cy]) => {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.stroke();
      
      // Crosshair
      this.ctx.beginPath();
      this.ctx.moveTo(cx - radius, cy);
      this.ctx.lineTo(cx + radius, cy);
      this.ctx.moveTo(cx, cy - radius);
      this.ctx.lineTo(cx, cy + radius);
      this.ctx.stroke();
    });
  }

  /**
   * Helper: Draw zone plate (UFO pattern)
   */
  private drawZonePlate(x: number, y: number, width: number, height: number): void {
    const imageData = this.ctx.createImageData(width, height);
    const data = imageData.data;
    const centerX = width / 2;
    const centerY = height / 2;

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const dx = px - centerX;
        const dy = py - centerY;
        const distSq = dx * dx + dy * dy;
        const value = Math.sin(distSq / 100) * 127 + 128;
        
        const i = (py * width + px) * 4;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = 255;
      }
    }

    this.ctx.putImageData(imageData, x, y);
  }

  /**
   * Helper: Draw slice information
   */
  private drawSliceInfo(slice: SliceData, width: number, height: number, config: PatternConfig): void {
    this.ctx.save();
    
    // Choose font based on pattern type
    let font = 'Inter, system-ui, -apple-system';
    let weight = 700;
    let letterSpacing = -0.5;
    let size = Math.max(16, Math.min(width / 15, 32));

    if (config.type === 'minimal-geometric') {
      font = 'Helvetica Neue, Arial';
      weight = 300;
      letterSpacing = 2;
    } else if (config.type === 'gradient-paradise') {
      font = 'Impact, Arial Black';
      weight = 900;
      letterSpacing = 3;
      size = Math.max(24, Math.min(width / 12, 48));
    } else if (config.type === 'neo-brutalism') {
      font = 'Arial Black, Impact';
      weight = 900;
      letterSpacing = 0;
    }

    this.ctx.font = `${weight} ${size}px ${font}`;
    this.ctx.fillStyle = config.textColor;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Shadow for visibility
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;
    
    // Name
    this.ctx.fillText(slice.name.toUpperCase(), width / 2, height / 2 - size / 2);
    
    // Dimensions
    this.ctx.font = `${weight} ${size * 0.6}px ${font}`;
    this.ctx.fillText(`${slice.width} × ${slice.height}`, width / 2, height / 2 + size / 2);
    
    this.ctx.restore();
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
  }
}

export const compositePatternGenerator = new CompositePatternGenerator();
