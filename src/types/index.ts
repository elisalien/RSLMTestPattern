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
  | 'smpte-75'
  | 'smpte-100'
  | 'ebu-75'
  | 'crosshatch'
  | 'monoscope'
  | 'zone-plate'
  | 'gradient-ramp'
  | 'pixel-grid'
  | 'resolume';

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
}

export interface ExportOptions {
  format: 'png' | 'pdf';
  resolution: '1080p' | '4K' | '8K' | 'original';
  exportAll: boolean;
  autoSave: boolean;
  namingPattern: string;
}
