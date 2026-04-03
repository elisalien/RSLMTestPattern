import { create } from 'zustand';
import {
  ResolumeSetup,
  TemplateType,
  ViewMode,
  OutputResolution,
  OverlaySource,
  SliceOverlays,
  Preset,
  DEFAULT_PRESET,
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

  // Settings
  template: TemplateType;
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
  globalOverlay: OverlaySource | null;
  sliceOverlays: SliceOverlays;

  // Presets
  savedPresets: Preset[];

  // UI
  isLoading: boolean;
  sidebarOpen: boolean;

  // Actions
  importXML: (xmlString: string) => void;
  setTemplate: (t: TemplateType) => void;
  setGridSize: (s: number) => void;
  setViewMode: (m: ViewMode) => void;
  setOutputResolution: (r: OutputResolution) => void;
  setCustomWidth: (w: number) => void;
  setCustomHeight: (h: number) => void;
  setBrandName: (n: string) => void;
  setLogo: (img: HTMLImageElement | null) => void;
  setGlobalOverlay: (src: OverlaySource | null) => void;
  setSliceOverlay: (sliceId: string, src: OverlaySource | null) => void;
  setShowLabels: (v: boolean) => void;
  setShowSafeZones: (v: boolean) => void;
  toggleSidebar: () => void;
  savePreset: (name: string) => void;
  loadPreset: (preset: Preset) => void;
  deletePreset: (name: string) => void;
  importPresets: (json: string) => void;
  exportPresets: () => string;
  getOutputDimensions: () => { width: number; height: number };
}

const saved = loadSettings();
const initial = { ...DEFAULT_PRESET, ...saved };

export const useStore = create<AppState>((set, get) => ({
  // Data
  resolumeSetup: null,
  rawXML: null,

  // Settings (restored from localStorage)
  template: initial.template,
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
  globalOverlay: null,
  sliceOverlays: {},

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

  // ─── Actions ─────────────────────────────────────────────────

  importXML: (xmlString: string) => {
    set({ isLoading: true });
    const { viewMode } = get();
    const setup = parser.parse(xmlString, viewMode);
    set({
      rawXML: xmlString,
      resolumeSetup: setup,
      isLoading: false,
      sliceOverlays: {},
    });
  },

  setTemplate: (t) => {
    set({ template: t });
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
      set({ viewMode: m, resolumeSetup: setup });
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
    });
    // Re-parse XML with new view mode
    const { rawXML } = get();
    if (rawXML) {
      const setup = parser.parse(rawXML, preset.viewMode);
      set({ resolumeSetup: setup });
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
  });
}
