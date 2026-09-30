import { create } from 'zustand';
import { LayerState, LogoLayer, ParamValue, Preset, SceneState, Setup, ViewMode, PatternScope } from '../core/types';
import { DEMO_SETUP, buildManualSetup, parseResolumeXML } from '../core/xml';
import { PATTERNS } from '../render/patterns';
import { OVERLAYS, DEFAULT_OVERLAYS_ON } from '../render/overlays';
import { ANIMS } from '../render/anims';
import { NEW_LOGO } from '../render/logos';
import { assets } from './assets';
import { DEFAULT_DECO } from '../render/deco';

// ─── Defaults ───────────────────────────────────────────────────

export function defaultScene(): SceneState {
  const overlays: Record<string, LayerState> = {};
  OVERLAYS.forEach(o => { overlays[o.id] = { enabled: DEFAULT_OVERLAYS_ON.includes(o.id), params: { ...o.defaults } }; });
  const anims: Record<string, LayerState> = {};
  ANIMS.forEach(a => { anims[a.id] = { enabled: false, params: { ...a.defaults } }; });
  const patternParams: SceneState['patternParams'] = {};
  PATTERNS.forEach(p => { patternParams[p.id] = { ...p.defaults }; });
  return {
    patternId: 'mire-pro', patternScope: 'slice', patternParams, overlays, anims, logos: [],
    deco: { ...DEFAULT_DECO }, themeId: 'studio', transparentBg: false, loopSeconds: 4, fps: 30, showTitle: '',
  };
}

/** Merge a stored scene over defaults so new params/layers always exist. */
function hydrateScene(s: Partial<SceneState> | undefined): SceneState {
  const d = defaultScene();
  if (!s || typeof s !== 'object') return d;
  const merged: SceneState = { ...d, ...s, patternParams: { ...d.patternParams }, overlays: { ...d.overlays }, anims: { ...d.anims } };
  for (const k of Object.keys(d.patternParams)) merged.patternParams[k] = { ...d.patternParams[k], ...(s.patternParams?.[k] || {}) };
  for (const k of Object.keys(d.overlays)) merged.overlays[k] = { enabled: s.overlays?.[k]?.enabled ?? d.overlays[k].enabled, params: { ...d.overlays[k].params, ...(s.overlays?.[k]?.params || {}) } };
  for (const k of Object.keys(d.anims)) merged.anims[k] = { enabled: s.anims?.[k]?.enabled ?? false, params: { ...d.anims[k].params, ...(s.anims?.[k]?.params || {}) } };
  merged.deco = { ...d.deco, ...(s.deco || {}) };
  // Old « Formes flottantes » animation → decorative shapes
  const old = (s.anims as Record<string, LayerState> | undefined)?.shapes;
  if (!s.deco && old?.enabled) {
    const map: Record<string, string> = { star: 'stars', heart: 'hearts', sparkle: 'sparkles', circle: 'circles', square: 'pixels', cross: 'crosses' };
    const k = String(old.params.kind || 'sparkle');
    merged.deco = { ...merged.deco, shapes: k === 'mix' ? Object.values(map) : [map[k] || 'sparkles'], motion: 'rise' };
  }
  merged.logos = Array.isArray(s.logos) ? s.logos.map((l, i) => ({ ...NEW_LOGO(i + 1), ...l })) : [];
  if (!PATTERNS.some(p => p.id === merged.patternId)) merged.patternId = d.patternId;
  merged.loopSeconds = clamp(Number(merged.loopSeconds) || 4, 0.5, 120);
  merged.fps = [24, 25, 30, 50, 60].includes(Number(merged.fps)) ? Number(merged.fps) : 30;
  return merged;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// ─── Persistence ────────────────────────────────────────────────

const KEY = 'rslm-v2';
interface Persisted {
  scene: SceneState;
  xml: { text: string; name: string } | null;
  manual: Parameters<typeof buildManualSetup>[0] | null;
  disabled: string[];
  view: ViewMode;
  screenId: string;
  prefs: Prefs;
  exportPrefs: ExportPrefs;
  presets: Preset[];
}

export interface Prefs {
  tab: string;
  quality: 'auto' | '1' | '0.5' | '0.25';
  guides: boolean;
  inputScreens: 'all' | string[];
}

export interface ExportPrefs {
  codec: string;
  scale: number;
  what: 'view' | 'comp' | 'screens' | 'slices';
  loops: number;
}

function load(): Partial<Persisted> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

let saveTimer: number | undefined;
function persist(s: AppState) {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const data: Persisted = {
      scene: s.scene, xml: s.xml, manual: s.manual, disabled: s.disabled, view: s.view,
      screenId: s.screenId, prefs: s.prefs, exportPrefs: s.exportPrefs, presets: s.presets,
    };
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch {
      // Huge XML: keep everything else
      try { localStorage.setItem(KEY, JSON.stringify({ ...data, xml: null })); } catch { /* ignore */ }
    }
  }, 250);
}

// ─── Store ──────────────────────────────────────────────────────

export interface Toast { id: number; kind: 'ok' | 'warn' | 'error'; text: string }

interface AppState {
  setup: Setup;
  xml: { text: string; name: string } | null;
  manual: Parameters<typeof buildManualSetup>[0] | null;
  scene: SceneState;
  disabled: string[];
  view: ViewMode;
  screenId: string;
  playing: boolean;
  prefs: Prefs;
  exportPrefs: ExportPrefs;
  presets: Preset[];
  toasts: Toast[];
  hover: { x: number; y: number; slice: string | null; rgb: string } | null;

  loadXML(text: string, name: string): boolean;
  newManual(o: Parameters<typeof buildManualSetup>[0]): void;
  resetSetup(): void;
  setView(v: ViewMode): void;
  setScreen(id: string): void;
  toggleSlice(id: string): void;
  setSlicesEnabled(ids: string[], on: boolean): void;
  setPlaying(v: boolean): void;
  setPrefs(p: Partial<Prefs>): void;
  setExportPrefs(p: Partial<ExportPrefs>): void;

  setScene(p: Partial<SceneState>): void;
  setPattern(id: string): void;
  setPatternScope(s: PatternScope): void;
  setPatternParam(k: string, v: ParamValue): void;
  setLayer(kind: 'overlays' | 'anims', id: string, patch: { enabled?: boolean; key?: string; value?: ParamValue }): void;
  resetLayer(kind: 'overlays' | 'anims', id: string): void;

  addLogo(assetId: string | null): string;
  updateLogo(id: string, p: Partial<LogoLayer>): void;
  removeLogo(id: string): void;
  duplicateLogo(id: string): void;
  moveLogo(id: string, dir: -1 | 1): void;

  savePreset(name: string): void;
  applyPreset(p: Preset): void;
  deletePreset(name: string): void;
  exportPresets(): Promise<string>;
  importPresets(json: string): Promise<number>;

  toast(kind: Toast['kind'], text: string): void;
  dismiss(id: number): void;
  setHover(h: AppState['hover']): void;
}

function setupFrom(p: Partial<Persisted>): { setup: Setup; xml: Persisted['xml']; manual: Persisted['manual'] } {
  if (p.xml?.text) {
    try { return { setup: parseResolumeXML(p.xml.text, p.xml.name), xml: p.xml, manual: null }; } catch { /* fall through */ }
  }
  if (p.manual) {
    try { return { setup: buildManualSetup(p.manual), xml: null, manual: p.manual }; } catch { /* fall through */ }
  }
  return { setup: DEMO_SETUP(), xml: null, manual: null };
}

const saved = load();
const initial = setupFrom(saved);
let toastSeq = 0;

export const useStore = create<AppState>((set, get) => {
  const commit = (patch: Partial<AppState>) => { set(patch); persist(get()); };
  const firstScreen = (s: Setup) => s.screens[0]?.id || '';

  return {
    ...initial,
    scene: hydrateScene(saved.scene),
    disabled: saved.disabled || [],
    view: saved.view || 'input',
    screenId: initial.setup.screens.some(s => s.id === saved.screenId) ? saved.screenId! : firstScreen(initial.setup),
    playing: true,
    prefs: { tab: 'mire', quality: 'auto', guides: true, inputScreens: 'all', ...(saved.prefs || {}) },
    exportPrefs: { codec: 'mp4', scale: 1, what: 'view', loops: 1, ...(saved.exportPrefs || {}) },
    presets: Array.isArray(saved.presets) ? saved.presets : [],
    toasts: [],
    hover: null,

    loadXML(text, name) {
      try {
        const setup = parseResolumeXML(text, name);
        commit({ setup, xml: { text, name }, manual: null, disabled: [], screenId: firstScreen(setup), prefs: { ...get().prefs, inputScreens: 'all' } });
        const n = setup.screens.reduce((a, s) => a + s.slices.length, 0);
        get().toast('ok', `${setup.name} : ${setup.screens.length} écran(s), ${n} slice(s), composition ${setup.comp.w} × ${setup.comp.h}.`);
        setup.warnings.forEach(w => get().toast('warn', w));
        return true;
      } catch (e) {
        get().toast('error', (e as Error).message);
        return false;
      }
    },
    newManual(o) {
      const setup = buildManualSetup(o);
      commit({ setup, manual: o, xml: null, disabled: [], screenId: firstScreen(setup), prefs: { ...get().prefs, inputScreens: 'all' } });
    },
    resetSetup() {
      const setup = DEMO_SETUP();
      commit({ setup, xml: null, manual: null, disabled: [], screenId: firstScreen(setup), view: 'input' });
    },
    setView(view) { commit({ view }); },
    setScreen(screenId) { commit({ screenId }); },
    toggleSlice(id) {
      const d = new Set(get().disabled);
      d.has(id) ? d.delete(id) : d.add(id);
      commit({ disabled: [...d] });
    },
    setSlicesEnabled(ids, on) {
      const d = new Set(get().disabled);
      ids.forEach(id => (on ? d.delete(id) : d.add(id)));
      commit({ disabled: [...d] });
    },
    setPlaying(playing) { set({ playing }); },
    setPrefs(p) { commit({ prefs: { ...get().prefs, ...p } }); },
    setExportPrefs(p) { commit({ exportPrefs: { ...get().exportPrefs, ...p } }); },

    setScene(p) { commit({ scene: { ...get().scene, ...p } }); },
    setPattern(patternId) { commit({ scene: { ...get().scene, patternId } }); },
    setPatternScope(patternScope) { commit({ scene: { ...get().scene, patternScope } }); },
    setPatternParam(k, v) {
      const sc = get().scene;
      commit({ scene: { ...sc, patternParams: { ...sc.patternParams, [sc.patternId]: { ...sc.patternParams[sc.patternId], [k]: v } } } });
    },
    setLayer(kind, id, patch) {
      const sc = get().scene;
      const cur = sc[kind][id];
      const next: LayerState = {
        enabled: patch.enabled ?? cur.enabled,
        params: patch.key ? { ...cur.params, [patch.key]: patch.value! } : cur.params,
      };
      commit({ scene: { ...sc, [kind]: { ...sc[kind], [id]: next } } });
    },
    resetLayer(kind, id) {
      const def = (kind === 'overlays' ? OVERLAYS : ANIMS).find(d => d.id === id);
      if (!def) return;
      const sc = get().scene;
      commit({ scene: { ...sc, [kind]: { ...sc[kind], [id]: { enabled: sc[kind][id].enabled, params: { ...def.defaults } } } } });
    },

    addLogo(assetId) {
      const sc = get().scene;
      const l = NEW_LOGO(sc.logos.length + 1, assetId);
      const a = assets.get(assetId);
      if (a) l.name = a.name.replace(/\.[a-z0-9]+$/i, '');
      // Spread new logos over free corners
      const used = new Set(sc.logos.map(x => x.anchor));
      l.anchor = (['tr', 'tl', 'br', 'bl', 'c', 'tc', 'bc', 'cl', 'cr'] as const).find(a2 => !used.has(a2)) || 'c';
      commit({ scene: { ...sc, logos: [...sc.logos, l] } });
      return l.id;
    },
    updateLogo(id, p) {
      const sc = get().scene;
      commit({ scene: { ...sc, logos: sc.logos.map(l => (l.id === id ? { ...l, ...p } : l)) } });
    },
    removeLogo(id) {
      const sc = get().scene;
      commit({ scene: { ...sc, logos: sc.logos.filter(l => l.id !== id) } });
    },
    duplicateLogo(id) {
      const sc = get().scene;
      const src = sc.logos.find(l => l.id === id);
      if (!src) return;
      const copy = { ...src, id: `logo-${Date.now().toString(36)}`, name: `${src.name} (copie)` };
      const i = sc.logos.indexOf(src);
      const logos = [...sc.logos];
      logos.splice(i + 1, 0, copy);
      commit({ scene: { ...sc, logos } });
    },
    moveLogo(id, dir) {
      const sc = get().scene;
      const i = sc.logos.findIndex(l => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sc.logos.length) return;
      const logos = [...sc.logos];
      [logos[i], logos[j]] = [logos[j], logos[i]];
      commit({ scene: { ...sc, logos } });
    },

    savePreset(name) {
      const p: Preset = { name, savedAt: new Date().toISOString(), scene: structuredClone(get().scene) };
      commit({ presets: [...get().presets.filter(x => x.name !== name), p] });
      get().toast('ok', `Preset « ${name} » enregistré.`);
    },
    applyPreset(p) {
      commit({ scene: hydrateScene(p.scene) });
      const missing = p.scene.logos?.filter(l => l.assetId && !assets.get(l.assetId)).length || 0;
      if (missing) get().toast('warn', `${missing} logo(s) de ce preset introuvable(s) : réimporte-les.`);
      else get().toast('ok', `Preset « ${p.name} » chargé.`);
    },
    deletePreset(name) { commit({ presets: get().presets.filter(p => p.name !== name) }); },
    async exportPresets() {
      const presets = get().presets;
      const ids = new Set(presets.flatMap(p => p.scene.logos.map(l => l.assetId).filter(Boolean) as string[]));
      const embedded: Record<string, { name: string; data: string }> = {};
      for (const id of ids) {
        const data = await assets.toDataURL(id);
        if (data) embedded[id] = { name: assets.get(id)!.name, data };
      }
      return JSON.stringify({ format: 'rslm-presets', version: 2, presets, assets: embedded }, null, 2);
    },
    async importPresets(json) {
      const data = JSON.parse(json);
      const list: Preset[] = Array.isArray(data) ? data : data.presets;
      if (!Array.isArray(list)) throw new Error('Fichier de presets invalide');
      const remap: Record<string, string> = {};
      if (data.assets) {
        for (const [oldId, a] of Object.entries<{ name: string; data: string }>(data.assets)) {
          if (assets.get(oldId)) { remap[oldId] = oldId; continue; }
          try { remap[oldId] = (await assets.fromDataURL(a.data, a.name)).id; } catch { /* skip */ }
        }
      }
      const merged = [...get().presets];
      let n = 0;
      for (const p of list) {
        if (!p?.name || !p.scene) continue;
        const scene = { ...p.scene, logos: (p.scene.logos || []).map(l => ({ ...l, assetId: l.assetId ? remap[l.assetId] || l.assetId : null })) };
        const fixed = { ...p, scene };
        const i = merged.findIndex(m => m.name === p.name);
        if (i >= 0) merged[i] = fixed; else merged.push(fixed);
        n++;
      }
      commit({ presets: merged });
      return n;
    },

    toast(kind, text) {
      const id = ++toastSeq;
      set({ toasts: [...get().toasts, { id, kind, text }] });
      window.setTimeout(() => get().dismiss(id), kind === 'error' ? 9000 : 5000);
    },
    dismiss(id) { set({ toasts: get().toasts.filter(t => t.id !== id) }); },
    setHover(hover) { set({ hover }); },
  };
});
