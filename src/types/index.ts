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

export type TemplateType =
  | 'classic-broadcast'
  | 'led-panel-pro'
  | 'projection-alignment'
  | 'minimal-clean';

export interface TemplateConfig {
  type: TemplateType;
  gridSize: number;
  globalGif?: HTMLImageElement | null;
}

export interface SliceGifConfig {
  [sliceId: string]: HTMLImageElement | null;
}

export interface ExportOptions {
  format: 'png' | 'pdf';
  resolution: '1080p' | '4K' | '8K' | 'original';
  exportAll: boolean;
  autoSave: boolean;
  namingPattern: string;
}

export interface OutputResolution {
  id: string;
  name: string;
  width: number;
  height: number;
}

export interface BrandingConfig {
  name: string;
  logo?: HTMLImageElement | null;
}

export type ViewMode = 'input' | 'output';
