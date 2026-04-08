import { create } from 'zustand';
import {
  ResolumeSetup,
  ScreenData,
  TemplateType,
  GraphicPresetType,
  ViewMode,
  OutputResolution,
  OverlaySource,
  SliceOverlays,
  Preset,
  LogoSettings,
  LogoInstance,
  DecorativeSettings,
  AnimationPresetType,
  VideoPresetType,
  ExportFormat,
  DEFAULT_PRESET,
  DEFAULT_LOGO_SETTINGS,
  DEFAULT_DECORATIVE_SETTINGS,
  MAX_LOGO_INSTANCES,
  OUTPUT_RESOLUTIONS,
} from './types';
import { ResolumeXMLParser } from './utils/resolume-parser';

const parser = new ResolumeXMLParser();

// ─── LocalStorage helpers ────────────────────────────────────────

const STORAGE_KEY = 'rslm-settings';

function loadSettings(): Partial<Preset> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSettings(preset: Preset) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preset));
  } catch { /* quota exceeded, ignore */ }
}

// ─── Store ───────────────────────────────────────────────────────

interface AppState {
  // Data
  resolumeSetup: ResolumeSetup | null;
  rawXML: string | null;

  // Screen navigation
  screens: ScreenData[];
  activeScreenIndex: number;

  // Settings
  template: TemplateType;
  graphicPreset: GraphicPresetType;
  gridSize: number;
  viewMode: ViewMode;
  outputResolution: OutputResolution;
  customWidth: number;
  customHeight: number;
  showLabels: boolean;
  showSafeZones: boolean;

  // Branding & overlays
  brandName: string;
  logo: HTMLImageElement | null;
  logoSettings: LogoSettings;
  extraLogos: LogoInstance[];
  decorativeSettings: DecorativeSettings;
  globalOverlay: OverlaySource | null;
  sliceOverlays: SliceOverlays;

  // Slice management
  disabledSlices: Set<string>;

  // Animation
  animationPreset: AnimationPresetType;
  videoPreset: VideoPresetType;
  exportFormat: ExportFormat;
  animationSpeed: number; // multiplier 0.25-4

  // Presets
  savedPresets: Preset[];

  // UI
  isLoading: boolean;
  sidebarOpen: boolean;
  isExporting: boolean;

  // Actions
  importXML: (xmlString: string) => void;
  setTemplate: (t: TemplateType) => void;
  setGraphicPreset: (p: GraphicPresetType) => void;
  setGridSize: (s: number) => void;
  setViewMode: (m: ViewMode) => void;
  setOutputResolution: (r: OutputResolution) => void;
  setCustomWidth: (w: number) => void;
  setCustomHeight: (h: number) => void;
  setBrandName: (n: string) => void;
  setLogo: (img: HTMLImageElement | null) => void;
  setLogoSettings: (s: Partial<LogoSettings>) => void;
  setDecorativeSettings: (s: Partial<DecorativeSettings>) => void;
  addLogoInstance: () => void;
  removeLogoInstance: (id: string) => void;
  updateLogoInstance: (id: string, settings: Partial<LogoSettings>) => void;
  setGlobalOverlay: (src: OverlaySource | null) => void;
  setSliceOverlay: (sliceId: string, src: OverlaySource | null) => void;
  setShowLabels: (v: boolean) => void;
  setShowSafeZones: (v: boolean) => void;
  toggleSidebar: () => void;
  setActiveScreen: (index: number) => void;
  toggleSlice: (sliceId: string) => void;
  enableAllSlices: () => void;
  disableAllSlices: () => void;
  setAnimationPreset: (p: AnimationPresetType) => void;
  setVideoPreset: (p: VideoPresetType) => void;
  setExportFormat: (f: ExportFormat) => void;
  setAnimationSpeed: (s: number) => void;
  setIsExporting: (v: boolean) => void;
  savePreset: (name: string) => void;
  loadPreset: (preset: Preset) => void;
  deletePreset: (name: string) => void;
  importPresets: (json: string) => void;
  exportPresets: () => string;
  getOutputDimensions: () => { width: number; height: number };
  getActiveSlices: () => import('./types').SliceData[];
}

const saved = loadSettings();
const initial = { ...DEFAULT_PRESET, ...saved };

export const useStore = create<AppState>((set, get) => ({
  // Data
  resolumeSetup: null,
  rawXML: null,

  // Screen navigation
  screens: [],
  activeScreenIndex: 0,

  // Settings (restored from localStorage)
  template: initial.template,
  graphicPreset: initial.graphicPreset || 'default',
  gridSize: initial.gridSize,
  viewMode: initial.viewMode,
  outputResolution: OUTPUT_RESOLUTIONS.find(r => r.id === initial.resolution) || OUTPUT_RESOLUTIONS[0],
  customWidth: initial.customWidth,
  customHeight: initial.customHeight,
  showLabels: initial.showLabels,
  showSafeZones: initial.showSafeZones,

  // Branding
  brandName: initial.brandName,
  logo: null,
  logoSettings: initial.logoSettings || DEFAULT_LOGO_SETTINGS,
  extraLogos: initial.extraLogos || [],
  decorativeSettings: initial.decorativeSettings || DEFAULT_DECORATIVE_SETTINGS,
  globalOverlay: null,
  sliceOverlays: {},

  // Slice management
  disabledSlices: new Set(),

  // Animation
  animationPreset: 'none',
  videoPreset: 'none',
  exportFormat: 'png',
  animationSpeed: 1,

  // Presets
  savedPresets: (() => {
    try {
      const raw = localStorage.getItem('rslm-presets');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  })(),

  // UI
  isLoading: false,
  sidebarOpen: true,
  isExporting: false,

  // ─── Actions ─────────────────────────────────────────────────

  importXML: (xmlString: string) => {
    set({ isLoading: true });
    const { viewMode } = get();
    const setup = parser.parse(xmlString, viewMode);
    set({
      rawXML: xmlString,
      resolumeSetup: setup,
      screens: setup?.screens || [],
      activeScreenIndex: 0,
      isLoading: false,
      sliceOverlays: {},
      disabledSlices: new Set(),
    });
  },

  setTemplate: (t) => {
    set({ template: t });
    persistSettings(get());
  },

  setGraphicPreset: (p) => {
    set({ graphicPreset: p });
    persistSettings(get());
  },

  setGridSize: (s) => {
    set({ gridSize: s });
    persistSettings(get());
  },

  setViewMode: (m) => {
    const { rawXML } = get();
    if (rawXML) {
      const setup = parser.parse(rawXML, m);
      set({
        viewMode: m,
        resolumeSetup: setup,
        screens: setup?.screens || [],
        activeScreenIndex: 0,
      });
    } else {
      set({ viewMode: m });
    }
    persistSettings(get());
  },

  setOutputResolution: (r) => {
    set({ outputResolution: r });
    persistSettings(get());
  },

  setCustomWidth: (w) => {
    set({ customWidth: w });
    persistSettings(get());
  },

  setCustomHeight: (h) => {
    set({ customHeight: h });
    persistSettings(get());
  },

  setBrandName: (n) => {
    set({ brandName: n });
    persistSettings(get());
  },

  setLogo: (img) => set({ logo: img }),

  setLogoSettings: (partial) => {
    set((state) => ({
      logoSettings: { ...state.logoSettings, ...partial },
    }));
    persistSettings(get());
  },

  setDecorativeSettings: (partial) => {
    set((state) => ({
      decorativeSettings: { ...state.decorativeSettings, ...partial },
    }));
    persistSettings(get());
  },

  addLogoInstance: () => {
    const { extraLogos } = get();
    if (extraLogos.length >= MAX_LOGO_INSTANCES - 1) return; // -1 because main logo counts
    const positions: import('./types').LogoPosition[] = ['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'];
    // Pick a position not already used
    const usedPositions = [get().logoSettings.position, ...extraLogos.map(l => l.settings.position)];
    const available = positions.filter(p => !usedPositions.includes(p));
    const pos = available[0] || 'center';
    const instance: LogoInstance = {
      id: `logo-${Date.now()}`,
      settings: { ...DEFAULT_LOGO_SETTINGS, position: pos },
    };
    set({ extraLogos: [...extraLogos, instance] });
    persistSettings(get());
  },

  removeLogoInstance: (id: string) => {
    set((state) => ({
      extraLogos: state.extraLogos.filter(l => l.id !== id),
    }));
    persistSettings(get());
  },

  updateLogoInstance: (id: string, partial: Partial<LogoSettings>) => {
    set((state) => ({
      extraLogos: state.extraLogos.map(l =>
        l.id === id ? { ...l, settings: { ...l.settings, ...partial } } : l
      ),
    }));
    persistSettings(get());
  },

  setGlobalOverlay: (src) => set({ globalOverlay: src }),

  setSliceOverlay: (sliceId, src) => {
    set((state) => ({
      sliceOverlays: { ...state.sliceOverlays, [sliceId]: src },
    }));
  },

  setShowLabels: (v) => {
    set({ showLabels: v });
    persistSettings(get());
  },

  setShowSafeZones: (v) => {
    set({ showSafeZones: v });
    persistSettings(get());
  },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setActiveScreen: (index: number) => {
    const { screens, rawXML, viewMode } = get();
    if (index < 0 || index >= screens.length) return;
    const screen = screens[index];
    // Update resolumeSetup with this screen's slices
    const currentSetup = get().resolumeSetup;
    if (currentSetup) {
      set({
        activeScreenIndex: index,
        resolumeSetup: {
          ...currentSetup,
          slices: screen.slices,
          compositionSize: screen.compositionSize,
        },
      });
    }
  },

  toggleSlice: (sliceId: string) => {
    set((state) => {
      const next = new Set(state.disabledSlices);
      if (next.has(sliceId)) {
        next.delete(sliceId);
      } else {
        next.add(sliceId);
      }
      return { disabledSlices: next };
    });
  },

  enableAllSlices: () => set({ disabledSlices: new Set() }),

  disableAllSlices: () => {
    const { resolumeSetup } = get();
    if (!resolumeSetup) return;
    set({ disabledSlices: new Set(resolumeSetup.slices.map(s => s.id)) });
  },

  setAnimationPreset: (p) => set({ animationPreset: p }),
  setVideoPreset: (p) => set({ videoPreset: p }),
  setExportFormat: (f) => set({ exportFormat: f }),
  setAnimationSpeed: (s) => set({ animationSpeed: s }),
  setIsExporting: (v) => set({ isExporting: v }),

  // ─── Presets ─────────────────────────────────────────────────

  savePreset: (name: string) => {
    const s = get();
    const preset: Preset = {
      name,
      template: s.template,
      gridSize: s.gridSize,
      viewMode: s.viewMode,
      resolution: s.outputResolution.id,
      customWidth: s.customWidth,
      customHeight: s.customHeight,
      brandName: s.brandName,
      showLabels: s.showLabels,
      showSafeZones: s.showSafeZones,
      graphicPreset: s.graphicPreset,
      logoSettings: s.logoSettings,
      decorativeSettings: s.decorativeSettings,
      extraLogos: s.extraLogos,
    };
    const presets = [...s.savedPresets.filter(p => p.name !== name), preset];
    set({ savedPresets: presets });
    localStorage.setItem('rslm-presets', JSON.stringify(presets));
  },

  loadPreset: (preset: Preset) => {
    const res = OUTPUT_RESOLUTIONS.find(r => r.id === preset.resolution) || OUTPUT_RESOLUTIONS[0];
    set({
      template: preset.template,
      gridSize: preset.gridSize,
      viewMode: preset.viewMode,
      outputResolution: res,
      customWidth: preset.customWidth,
      customHeight: preset.customHeight,
      brandName: preset.brandName,
      showLabels: preset.showLabels,
      showSafeZones: preset.showSafeZones,
      graphicPreset: preset.graphicPreset || 'default',
      logoSettings: preset.logoSettings || DEFAULT_LOGO_SETTINGS,
      decorativeSettings: preset.decorativeSettings || DEFAULT_DECORATIVE_SETTINGS,
      extraLogos: preset.extraLogos || [],
    });
    // Re-parse XML with new view mode
    const { rawXML } = get();
    if (rawXML) {
      const setup = parser.parse(rawXML, preset.viewMode);
      set({ resolumeSetup: setup, screens: setup?.screens || [] });
    }
    persistSettings(get());
  },

  deletePreset: (name: string) => {
    const presets = get().savedPresets.filter(p => p.name !== name);
    set({ savedPresets: presets });
    localStorage.setItem('rslm-presets', JSON.stringify(presets));
  },

  importPresets: (json: string) => {
    try {
      const imported: Preset[] = JSON.parse(json);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      const existing = get().savedPresets;
      const merged = [...existing];
      for (const p of imported) {
        if (p.name && p.template) {
          const idx = merged.findIndex(m => m.name === p.name);
          if (idx >= 0) merged[idx] = p;
          else merged.push(p);
        }
      }
      set({ savedPresets: merged });
      localStorage.setItem('rslm-presets', JSON.stringify(merged));
    } catch {
      throw new Error('Invalid preset file');
    }
  },

  exportPresets: () => {
    return JSON.stringify(get().savedPresets, null, 2);
  },

  getOutputDimensions: () => {
    const { resolumeSetup, outputResolution, customWidth, customHeight } = get();
    if (!resolumeSetup) return { width: 1920, height: 1080 };
    if (outputResolution.id === 'original') return resolumeSetup.compositionSize;
    if (outputResolution.id === 'custom') return { width: customWidth, height: customHeight };
    return { width: outputResolution.width, height: outputResolution.height };
  },

  getActiveSlices: () => {
    const { resolumeSetup, disabledSlices } = get();
    if (!resolumeSetup) return [];
    return resolumeSetup.slices.filter(s => !disabledSlices.has(s.id));
  },
}));

function persistSettings(s: AppState) {
  saveSettings({
    name: 'Last Session',
    template: s.template,
    gridSize: s.gridSize,
    viewMode: s.viewMode,
    resolution: s.outputResolution.id,
    customWidth: s.customWidth,
    customHeight: s.customHeight,
    brandName: s.brandName,
    showLabels: s.showLabels,
    showSafeZones: s.showSafeZones,
    graphicPreset: s.graphicPreset,
    logoSettings: s.logoSettings,
    decorativeSettings: s.decorativeSettings,
    extraLogos: s.extraLogos,
  });
}
