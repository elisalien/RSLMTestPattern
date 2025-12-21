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
  | 'complete-pro'       // TOUS les éléments combinés - look pro
  | 'minimal-geometric'  // Cercles + grilles + typo élégante
  | 'gradient-paradise'  // Multi-gradients + overlays
  | 'retro-future'       // Mix CRT + modern design
  | 'technical-beauty'   // Éléments techniques + aesthetic
  | 'glassmorphic'       // Glassmorphism + néomorphisme
  | 'broadcast-modern'   // SMPTE + design moderne
  | 'pixel-art-pro'      // Pixel grid + design sophistiqué
  | 'smpte-75'          // Classic (legacy)
  | 'crosshatch'        // Classic (legacy)
  | 'resolume';         // Classic (legacy)

export type StylePreset = 
  | 'behance-2025'       // Tendances Behance actuelles
  | 'motion-designer'    // Style motion design pro
  | 'tech-minimal'       // Minimal tech aesthetic
  | 'retro-wave'         // Synthwave/retrowave
  | 'neo-brutalism'      // Néo-brutalisme
  | 'glassmorphism'      // Glass effect moderne
  | 'windows-xp'         // Nostalgie XP
  | 'philips-pm5544'     // Test pattern classique
  | 'commodore-64'       // 8-bit aesthetic
  | 'modern';            // Par défaut

export interface LayoutElement {
  type: 'gradient' | 'grid' | 'circles' | 'bars' | 'zone-plate' | 'text' | 'scanlines' | 'glow';
  enabled: boolean;
  opacity: number;
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light';
}

export interface CompositeLayout {
  name: string;
  description: string;
  elements: LayoutElement[];
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  typography: {
    font: string;
    size: number;
    weight: number;
    letterSpacing: number;
  };
}

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
  compositeLayout?: CompositeLayout;
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
  font?: string;
  colorScheme?: 'vibrant' | 'monochrome' | 'pastel' | 'neon' | 'custom';
}

// Preset composite layouts
export const COMPOSITE_LAYOUTS: Record<string, CompositeLayout> = {
  'complete-pro': {
    name: 'Complete Professional',
    description: 'Tous les éléments techniques combinés avec design moderne',
    elements: [
      { type: 'gradient', enabled: true, opacity: 0.3, blendMode: 'multiply' },
      { type: 'bars', enabled: true, opacity: 1.0, blendMode: 'normal' },
      { type: 'grid', enabled: true, opacity: 0.6, blendMode: 'overlay' },
      { type: 'circles', enabled: true, opacity: 0.8, blendMode: 'normal' },
      { type: 'zone-plate', enabled: true, opacity: 0.4, blendMode: 'screen' },
      { type: 'text', enabled: true, opacity: 1.0, blendMode: 'normal' },
    ],
    colorScheme: {
      primary: '#00F5FF',
      secondary: '#FF00FF',
      accent: '#FFFF00',
      background: '#0A0A0A',
    },
    typography: {
      font: 'Inter, system-ui, -apple-system',
      size: 24,
      weight: 700,
      letterSpacing: -0.5,
    },
  },
  'minimal-geometric': {
    name: 'Minimal Geometric',
    description: 'Design épuré avec cercles et typographie élégante',
    elements: [
      { type: 'circles', enabled: true, opacity: 1.0, blendMode: 'normal' },
      { type: 'grid', enabled: true, opacity: 0.3, blendMode: 'overlay' },
      { type: 'text', enabled: true, opacity: 1.0, blendMode: 'normal' },
    ],
    colorScheme: {
      primary: '#FFFFFF',
      secondary: '#E0E0E0',
      accent: '#00FF9F',
      background: '#0F0F0F',
    },
    typography: {
      font: 'Neue Haas Grotesk, Helvetica Neue',
      size: 32,
      weight: 300,
      letterSpacing: 2,
    },
  },
  'gradient-paradise': {
    name: 'Gradient Paradise',
    description: 'Multi-gradients vibrants avec overlays sophistiqués',
    elements: [
      { type: 'gradient', enabled: true, opacity: 1.0, blendMode: 'normal' },
      { type: 'gradient', enabled: true, opacity: 0.7, blendMode: 'screen' },
      { type: 'gradient', enabled: true, opacity: 0.5, blendMode: 'soft-light' },
      { type: 'grid', enabled: true, opacity: 0.2, blendMode: 'overlay' },
      { type: 'glow', enabled: true, opacity: 0.8, blendMode: 'screen' },
      { type: 'text', enabled: true, opacity: 1.0, blendMode: 'normal' },
    ],
    colorScheme: {
      primary: '#FF6B9D',
      secondary: '#C44569',
      accent: '#FEA47F',
      background: '#1A1A2E',
    },
    typography: {
      font: 'Monument Extended, Impact',
      size: 48,
      weight: 900,
      letterSpacing: 3,
    },
  },
  'glassmorphic': {
    name: 'Glassmorphic Design',
    description: 'Glass effect avec blur et transparence',
    elements: [
      { type: 'gradient', enabled: true, opacity: 0.6, blendMode: 'normal' },
      { type: 'grid', enabled: true, opacity: 0.4, blendMode: 'overlay' },
      { type: 'circles', enabled: true, opacity: 0.5, blendMode: 'screen' },
      { type: 'text', enabled: true, opacity: 0.9, blendMode: 'normal' },
    ],
    colorScheme: {
      primary: '#FFFFFF',
      secondary: '#F0F0F0',
      accent: '#7B68EE',
      background: 'rgba(255, 255, 255, 0.1)',
    },
    typography: {
      font: 'SF Pro Display, system-ui',
      size: 28,
      weight: 600,
      letterSpacing: 0,
    },
  },
};
