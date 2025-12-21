export interface SliceData {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  inputRect: { x: number; y: number }[];
  outputRect: { x: number; y: number }[];
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

export type PatternType = 
  | 'complete-pro'
  | 'minimal-geometric'
  | 'gradient-paradise'
  | 'glassmorphic'
  | 'retro-future'
  | 'neo-brutalism'
  | 'smpte-75'
  | 'crosshatch'
  | 'pixel-grid'
  | 'resolume';

export type StylePreset = 
  | 'modern'
  | 'windows-xp'
  | 'philips-pm5544'
  | 'bbc-test-card'
  | 'smpte-classic'
  | 'retro-crt'
  | 'commodore-64'
  | 'teletext';

export interface PatternConfig {
  type: PatternType;
  backgroundColor: string;
  gridColor: string;
  textColor: string;
  showText: boolean;
  showUFO: boolean;
  showDiagonal: boolean;
  gridSize: number;
  fontSize: number;
  customText?: string;
  stylePreset?: StylePreset;
}

export interface ExportOptions {
  format: 'png' | 'pdf';
  resolution: '1080p' | '4K' | '8K' | 'original';
  exportAll: boolean;
  autoSave: boolean;
  namingPattern: string;
}

export interface BrandingConfig {
  name: string;
  logo?: HTMLImageElement;
  showCentralBranding: boolean;
}

export type ViewMode = 'input' | 'output';
