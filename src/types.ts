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

export interface ScreenData {
  id: string;
  name: string;
  slices: SliceData[];
  compositionSize: { width: number; height: number };
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
  screens: ScreenData[];
}

// ─── Templates ───────────────────────────────────────────────────

export type TemplateType =
  | 'smpte-broadcast'
  | 'convergence'
  | 'led-checkerboard'
  | 'grid-mapping'
  | 'gradient-focus'
  | 'minimal';

export type GraphicPresetType =
  | 'default'
  | 'retro-ps1'
  | 'kawaii-core'
  | 'frutiger-aero';

export interface TemplateInfo {
  id: TemplateType;
  name: string;
  description: string;
  icon: string;
}

export interface GraphicPresetInfo {
  id: GraphicPresetType;
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

export const GRAPHIC_PRESETS: GraphicPresetInfo[] = [
  { id: 'default', name: 'Default', icon: '🖥️', description: 'Standard broadcast test pattern' },
  { id: 'retro-ps1', name: 'Retro PS1', icon: '🎮', description: 'Low-poly PS1 era dithering and CRT scanlines' },
  { id: 'kawaii-core', name: 'Kawaii Core', icon: '🌸', description: 'Needy Streamer Overload pastel aesthetic' },
  { id: 'frutiger-aero', name: 'Frutiger Aero', icon: '💧', description: 'Glossy gradients, translucent bubbles, nature' },
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

// ─── Decorative Elements ────────────────────────────────────────

export type DecorativeElementType =
  | 'stars'
  | 'hearts'
  | 'sparkles'
  | 'music-notes'
  | 'flowers'
  | 'diamonds'
  | 'clouds'
  | 'pixels'
  | 'circles'
  | 'crosses'
  | 'arrows'
  | 'lightning';

export interface DecorativeSettings {
  enabled: DecorativeElementType[];
  density: number;    // 1-5 (how many elements)
  size: number;       // 50-200 (percentage of default size)
  opacity: number;    // 10-100
  animated: boolean;  // subtle floating animation
  animSpeed: number;  // 0.25-4 speed multiplier
  durationMs: number; // animation cycle duration for looping export
}

export const DECORATIVE_ELEMENTS: { id: DecorativeElementType; name: string; icon: string }[] = [
  { id: 'stars', name: 'Stars', icon: '*' },
  { id: 'hearts', name: 'Hearts', icon: '<3' },
  { id: 'sparkles', name: 'Sparkles', icon: '+' },
  { id: 'music-notes', name: 'Notes', icon: '#' },
  { id: 'flowers', name: 'Flowers', icon: '@' },
  { id: 'diamonds', name: 'Diamonds', icon: '<>' },
  { id: 'clouds', name: 'Clouds', icon: '~' },
  { id: 'pixels', name: 'Pixels', icon: '[]' },
  { id: 'circles', name: 'Circles', icon: 'O' },
  { id: 'crosses', name: 'Crosses', icon: 'X' },
  { id: 'arrows', name: 'Arrows', icon: '^' },
  { id: 'lightning', name: 'Bolts', icon: '!' },
];

export const DEFAULT_DECORATIVE_SETTINGS: DecorativeSettings = {
  enabled: [],
  density: 2,
  size: 100,
  opacity: 40,
  animated: false,
  animSpeed: 1,
  durationMs: LOOP_DURATION_MS,
};

// ─── Logo Settings ──────────────────────────────────────────────

export type LogoPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface LogoSettings {
  position: LogoPosition;
  size: number;       // 1-100 (percentage of slice min dimension)
  opacity: number;    // 0-100
  rotation: number;   // degrees 0-360
  padding: number;    // pixels from edge
  tint: string;       // hex color or '' for none
  blendMode: GlobalCompositeOperation;
}

export const DEFAULT_LOGO_SETTINGS: LogoSettings = {
  position: 'top-right',
  size: 10,
  opacity: 75,
  rotation: 0,
  padding: 10,
  tint: '',
  blendMode: 'source-over',
};

// ─── Logo Duplication ───────────────────────────────────────────

export interface LogoInstance {
  id: string;
  settings: LogoSettings;
  image: HTMLImageElement | null; // null = uses main logo
}

export const MAX_LOGO_INSTANCES = 9;

export const LOGO_POSITIONS: { id: LogoPosition; label: string }[] = [
  { id: 'top-left', label: 'TL' },
  { id: 'top-center', label: 'TC' },
  { id: 'top-right', label: 'TR' },
  { id: 'center-left', label: 'CL' },
  { id: 'center', label: 'C' },
  { id: 'center-right', label: 'CR' },
  { id: 'bottom-left', label: 'BL' },
  { id: 'bottom-center', label: 'BC' },
  { id: 'bottom-right', label: 'BR' },
];

export const BLEND_MODES: { id: GlobalCompositeOperation; label: string }[] = [
  { id: 'source-over', label: 'Normal' },
  { id: 'multiply', label: 'Multiply' },
  { id: 'screen', label: 'Screen' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'lighten', label: 'Lighten' },
  { id: 'darken', label: 'Darken' },
  { id: 'color-dodge', label: 'Dodge' },
  { id: 'difference', label: 'Difference' },
];

// ─── Animation Presets ──────────────────────────────────────────

export type AnimationPresetType =
  | 'none'
  | 'pulse'
  | 'rotate'
  | 'bounce'
  | 'fade-in-out'
  | 'slide-horizontal'
  | 'slide-vertical'
  | 'zoom-in-out'
  | 'glitch';

export interface AnimationPreset {
  id: AnimationPresetType;
  name: string;
  description: string;
  durationMs: number;
}

export const LOOP_DURATION_MS = 5000;

export const ANIMATION_PRESETS: AnimationPreset[] = [
  { id: 'none', name: 'None', description: 'Static', durationMs: 0 },
  { id: 'pulse', name: 'Pulse', description: 'Scale breathing effect', durationMs: LOOP_DURATION_MS },
  { id: 'rotate', name: 'Rotate 360', description: 'Full rotation loop', durationMs: LOOP_DURATION_MS },
  { id: 'bounce', name: 'Bounce', description: 'Vertical bounce', durationMs: LOOP_DURATION_MS },
  { id: 'fade-in-out', name: 'Fade In/Out', description: 'Opacity cycle', durationMs: LOOP_DURATION_MS },
  { id: 'slide-horizontal', name: 'Slide H', description: 'Horizontal slide loop', durationMs: LOOP_DURATION_MS },
  { id: 'slide-vertical', name: 'Slide V', description: 'Vertical slide loop', durationMs: LOOP_DURATION_MS },
  { id: 'zoom-in-out', name: 'Zoom', description: 'Scale zoom cycle', durationMs: LOOP_DURATION_MS },
  { id: 'glitch', name: 'Glitch', description: 'Random offset glitch', durationMs: LOOP_DURATION_MS },
];

// ─── Video Content Presets ──────────────────────────────────────

export type VideoPresetType =
  | 'none'
  | 'color-cycle'
  | 'gradient-sweep'
  | 'scanline-scroll'
  | 'noise-static'
  | 'plasma'
  | 'rainbow-bars'
  | 'countdown-loop'
  | 'waveform';

export interface VideoPreset {
  id: VideoPresetType;
  name: string;
  description: string;
  fps: number;
  durationMs: number;
}

export const VIDEO_PRESETS: VideoPreset[] = [
  { id: 'none', name: 'None', description: 'Static pattern only', fps: 0, durationMs: 0 },
  { id: 'color-cycle', name: 'Color Cycle', description: 'Hue rotation through spectrum', fps: 30, durationMs: LOOP_DURATION_MS },
  { id: 'gradient-sweep', name: 'Gradient Sweep', description: 'Moving gradient across slices', fps: 30, durationMs: LOOP_DURATION_MS },
  { id: 'scanline-scroll', name: 'Scanline Scroll', description: 'Scrolling CRT scanlines', fps: 30, durationMs: LOOP_DURATION_MS },
  { id: 'noise-static', name: 'Noise / Static', description: 'Animated TV noise', fps: 15, durationMs: LOOP_DURATION_MS },
  { id: 'plasma', name: 'Plasma', description: 'Psychedelic plasma animation', fps: 30, durationMs: LOOP_DURATION_MS },
  { id: 'rainbow-bars', name: 'Rainbow Bars', description: 'Scrolling rainbow color bars', fps: 30, durationMs: LOOP_DURATION_MS },
  { id: 'countdown-loop', name: 'Countdown Loop', description: '5-second countdown circle', fps: 30, durationMs: LOOP_DURATION_MS },
  { id: 'waveform', name: 'Waveform', description: 'Oscillating waveform display', fps: 30, durationMs: LOOP_DURATION_MS },
];

// ─── Export Formats ─────────────────────────────────────────────

export type ExportFormat = 'png' | 'webm';

export interface ExportFormatInfo {
  id: ExportFormat;
  name: string;
  description: string;
  mimeType: string;
}

export const EXPORT_FORMATS: ExportFormatInfo[] = [
  { id: 'png', name: 'PNG', description: 'Static image', mimeType: 'image/png' },
  { id: 'webm', name: 'WebM', description: '5s video loop', mimeType: 'video/webm' },
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
  graphicPreset?: GraphicPresetType;
  logoSettings?: LogoSettings;
  decorativeSettings?: DecorativeSettings;
  extraLogos?: LogoInstance[];
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
  graphicPreset: 'default',
  logoSettings: DEFAULT_LOGO_SETTINGS,
  decorativeSettings: DEFAULT_DECORATIVE_SETTINGS,
  extraLogos: [],
};
