// ─── Resolume Data ───────────────────────────────────────────────

export interface SliceData {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  inputRect: Point[];
  outputRect: Point[];
}

export interface Point {
  x: number;
  y: number;
}

export interface ResolumeSetup {
  name: string;
  version: {
    name: string;
    major: number;
    minor: number;
    micro: number;
  };
  compositionSize: {
    width: number;
    height: number;
  };
  slices: SliceData[];
}

// ─── Templates ───────────────────────────────────────────────────

export type TemplateType =
  | 'smpte-broadcast'
  | 'convergence'
  | 'led-checkerboard'
  | 'grid-mapping'
  | 'gradient-focus'
  | 'minimal';

export interface TemplateInfo {
  id: TemplateType;
  name: string;
  description: string;
  icon: string;
}

export const TEMPLATES: TemplateInfo[] = [
  { id: 'smpte-broadcast', name: 'SMPTE Broadcast', icon: '📺', description: 'Color bars, safe zones, PLUGE' },
  { id: 'convergence', name: 'Convergence', icon: '🎯', description: 'Grid, circles, crosshairs, gradients' },
  { id: 'led-checkerboard', name: 'LED Checkerboard', icon: '🟦', description: 'Colored checkerboard per slice' },
  { id: 'grid-mapping', name: 'Grid Mapping', icon: '🔲', description: 'Numbered grid for LED panels' },
  { id: 'gradient-focus', name: 'Focus & Geometry', icon: '🔵', description: 'Focus rings, radial lines, zone plate' },
  { id: 'minimal', name: 'Minimal', icon: '⬜', description: 'Ultra-clean essential markers' },
];

// ─── Settings ────────────────────────────────────────────────────

export type ViewMode = 'input' | 'output';

export interface OutputResolution {
  id: string;
  name: string;
  width: number;
  height: number;
}

export const OUTPUT_RESOLUTIONS: OutputResolution[] = [
  { id: 'original', name: 'Original (XML)', width: 0, height: 0 },
  { id: 'hd', name: 'HD 1280x720', width: 1280, height: 720 },
  { id: 'fhd', name: 'Full HD 1920x1080', width: 1920, height: 1080 },
  { id: '2k', name: '2K 2560x1440', width: 2560, height: 1440 },
  { id: '4k', name: '4K UHD 3840x2160', width: 3840, height: 2160 },
  { id: 'custom', name: 'Custom', width: 0, height: 0 },
];

// ─── Overlay ─────────────────────────────────────────────────────

export type OverlaySource = HTMLImageElement | HTMLVideoElement;

export interface SliceOverlays {
  [sliceId: string]: OverlaySource | null;
}

// ─── Presets ─────────────────────────────────────────────────────

export interface Preset {
  name: string;
  template: TemplateType;
  gridSize: number;
  viewMode: ViewMode;
  resolution: string;
  customWidth: number;
  customHeight: number;
  brandName: string;
  showLabels: boolean;
  showSafeZones: boolean;
}

export const DEFAULT_PRESET: Preset = {
  name: 'Default',
  template: 'smpte-broadcast',
  gridSize: 64,
  viewMode: 'output',
  resolution: 'original',
  customWidth: 1920,
  customHeight: 1080,
  brandName: '',
  showLabels: true,
  showSafeZones: true,
};
