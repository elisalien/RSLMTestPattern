import { useRef, useCallback, useState } from 'react';
import {
  Upload, Download, Image as ImageIcon, Film, Grid3x3,
  Settings, Save, FolderOpen, Trash2, Eye, EyeOff, Tag,
  Monitor, Layers, Palette, Sparkles, ChevronDown, ChevronUp,
  Move, Plus, Minus, Copy,
} from 'lucide-react';
import { useStore } from '../store';
import {
  TEMPLATES, OUTPUT_RESOLUTIONS, TemplateType, GRAPHIC_PRESETS,
  GraphicPresetType, LOGO_POSITIONS, BLEND_MODES, ANIMATION_PRESETS,
  LogoPosition, AnimationPresetType,
  DECORATIVE_ELEMENTS, DecorativeElementType,
  MAX_LOGO_INSTANCES,
} from '../types';
import { exportComposition, exportVideo } from './Preview';

export function Sidebar() {
  const sidebarOpen = useStore(s => s.sidebarOpen);
  if (!sidebarOpen) return null;

  return (
    <aside className="w-80 bg-gray-900/95 border-r border-gray-700/50 overflow-y-auto shrink-0 flex flex-col sidebar-responsive">
      <div className="flex flex-col gap-1 p-3">
        <ImportSection />
        <ScreenNavigator />
        <SliceManager />
        <TemplateSection />
        <GraphicPresetSection />
        <SettingsSection />
        <BrandingSection />
        <LogoSettingsSection />
        <LogoDuplicationSection />
        <DecorativeElementsSection />
        <AnimationSection />
        <PresetSection />
        <ExportSection />
      </div>
    </aside>
  );
}

// ─── Import ──────────────────────────────────────────────────────

function ImportSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const importXML = useStore(s => s.importXML);
  const isLoading = useStore(s => s.isLoading);
  const setup = useStore(s => s.resolumeSetup);
  const viewMode = useStore(s => s.viewMode);
  const setViewMode = useStore(s => s.setViewMode);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const xml = e.target?.result as string;
      if (xml) importXML(xml);
    };
    reader.readAsText(file);
  }, [importXML]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <Section title="Import XML" icon={<Upload size={16} />}>
      <input ref={fileRef} type="file" accept=".xml" onChange={onChange} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={isLoading}
        className="w-full btn btn-success flex items-center justify-center gap-2 py-2.5 text-sm"
      >
        {isLoading ? (
          <><div className="spinner w-4 h-4" /> Loading...</>
        ) : (
          <><Upload size={16} /> Import Resolume XML</>
        )}
      </button>

      {setup && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Status</span>
            <span className="text-green-400 font-medium">{setup.slices.length} slices loaded</span>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Advanced View</label>
            <div className="toggle-group w-full">
              <button
                onClick={() => setViewMode('output')}
                className={`toggle-btn flex-1 text-xs ${viewMode === 'output' ? 'active' : ''}`}
                title="Advanced Output: Final screen coordinates as mapped by Resolume"
              >
                Output (Screen)
              </button>
              <button
                onClick={() => setViewMode('input')}
                className={`toggle-btn flex-1 text-xs ${viewMode === 'input' ? 'active' : ''}`}
                title="Advanced Input: Source composition coordinates before transformation"
              >
                Input (Source)
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              {viewMode === 'output'
                ? 'Output: Final screen mapping positions (OutputRect)'
                : 'Input: Source composition coordinates (InputRect)'}
            </p>
          </div>
        </div>
      )}
    </Section>
  );
}

// ─── Screen Navigator ───────────────────────────────────────────

function ScreenNavigator() {
  const screens = useStore(s => s.screens);
  const activeIndex = useStore(s => s.activeScreenIndex);
  const setActiveScreen = useStore(s => s.setActiveScreen);

  if (screens.length <= 1) return null;

  return (
    <Section title="Screens" icon={<Monitor size={16} />}>
      <div className="space-y-1">
        {screens.map((screen, i) => (
          <button
            key={screen.id}
            onClick={() => setActiveScreen(i)}
            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all flex items-center justify-between ${
              i === activeIndex
                ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300'
                : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            <span className="font-medium truncate">{screen.name}</span>
            <span className="text-[10px] opacity-60">{screen.slices.length} slices | {screen.compositionSize.width}x{screen.compositionSize.height}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

// ─── Slice Manager ──────────────────────────────────────────────

function SliceManager() {
  const setup = useStore(s => s.resolumeSetup);
  const disabledSlices = useStore(s => s.disabledSlices);
  const toggleSlice = useStore(s => s.toggleSlice);
  const enableAll = useStore(s => s.enableAllSlices);
  const disableAll = useStore(s => s.disableAllSlices);
  const [expanded, setExpanded] = useState(false);

  if (!setup || setup.slices.length === 0) return null;

  const activeCount = setup.slices.length - disabledSlices.size;

  return (
    <Section title={`Slices (${activeCount}/${setup.slices.length})`} icon={<Layers size={16} />}>
      <div className="flex gap-1.5 mb-2">
        <button onClick={enableAll} className="flex-1 btn btn-secondary text-[10px] py-1">
          Enable All
        </button>
        <button onClick={disableAll} className="flex-1 btn btn-secondary text-[10px] py-1">
          Disable All
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="btn btn-secondary text-[10px] py-1 px-2"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>
      {expanded && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {setup.slices.map(slice => {
            const disabled = disabledSlices.has(slice.id);
            return (
              <button
                key={slice.id}
                onClick={() => toggleSlice(slice.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all ${
                  disabled
                    ? 'bg-gray-800/30 text-gray-600 line-through'
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                {disabled ? <EyeOff size={12} /> : <Eye size={12} className="text-cyan-400" />}
                <span className="truncate flex-1 text-left">{slice.name}</span>
                <span className="text-[10px] opacity-50">{slice.width}x{slice.height}</span>
              </button>
            );
          })}
        </div>
      )}
    </Section>
  );
}

// ─── Templates ───────────────────────────────────────────────────

function TemplateSection() {
  const template = useStore(s => s.template);
  const setTemplate = useStore(s => s.setTemplate);

  return (
    <Section title="Template" icon={<Grid3x3 size={16} />}>
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            onClick={() => setTemplate(t.id as TemplateType)}
            className={`p-2.5 rounded-lg border text-center transition-all text-xs ${
              template === t.id
                ? 'border-cyan-500 bg-cyan-500/10 shadow-sm shadow-cyan-500/20'
                : 'border-gray-700 hover:border-gray-500 bg-gray-800/50'
            }`}
            title={t.description}
          >
            <div className="text-xl mb-1">{t.icon}</div>
            <div className="text-gray-300 font-medium leading-tight">{t.name}</div>
          </button>
        ))}
      </div>
    </Section>
  );
}

// ─── Graphic Presets ────────────────────────────────────────────

function GraphicPresetSection() {
  const graphicPreset = useStore(s => s.graphicPreset);
  const setGraphicPreset = useStore(s => s.setGraphicPreset);

  return (
    <Section title="Graphic Preset" icon={<Palette size={16} />}>
      <div className="grid grid-cols-2 gap-2">
        {GRAPHIC_PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => setGraphicPreset(p.id as GraphicPresetType)}
            className={`p-2 rounded-lg border text-center transition-all text-xs ${
              graphicPreset === p.id
                ? 'border-purple-500 bg-purple-500/10 shadow-sm shadow-purple-500/20'
                : 'border-gray-700 hover:border-gray-500 bg-gray-800/50'
            }`}
            title={p.description}
          >
            <div className="text-lg mb-0.5">{p.icon}</div>
            <div className="text-gray-300 font-medium leading-tight text-[11px]">{p.name}</div>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-gray-500 mt-1.5">
        {GRAPHIC_PRESETS.find(p => p.id === graphicPreset)?.description}
      </p>
    </Section>
  );
}

// ─── Settings ────────────────────────────────────────────────────

function SettingsSection() {
  const gridSize = useStore(s => s.gridSize);
  const setGridSize = useStore(s => s.setGridSize);
  const outputResolution = useStore(s => s.outputResolution);
  const setOutputResolution = useStore(s => s.setOutputResolution);
  const customWidth = useStore(s => s.customWidth);
  const customHeight = useStore(s => s.customHeight);
  const setCustomWidth = useStore(s => s.setCustomWidth);
  const setCustomHeight = useStore(s => s.setCustomHeight);
  const showLabels = useStore(s => s.showLabels);
  const setShowLabels = useStore(s => s.setShowLabels);
  const showSafeZones = useStore(s => s.showSafeZones);
  const setShowSafeZones = useStore(s => s.setShowSafeZones);
  const setup = useStore(s => s.resolumeSetup);

  return (
    <Section title="Settings" icon={<Settings size={16} />}>
      <label className="text-xs text-gray-400 mb-1 block">Output Resolution</label>
      <select
        value={outputResolution.id}
        onChange={(e) => {
          const r = OUTPUT_RESOLUTIONS.find(r => r.id === e.target.value);
          if (r) setOutputResolution(r);
        }}
        className="input text-sm mb-2"
      >
        <option value="original">
          Original{setup ? ` (${setup.compositionSize.width}x${setup.compositionSize.height})` : ''}
        </option>
        {OUTPUT_RESOLUTIONS.slice(1).map(r => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>

      {outputResolution.id === 'custom' && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-xs text-gray-500">Width</label>
            <input type="number" min={320} max={7680} value={customWidth}
              onChange={e => setCustomWidth(parseInt(e.target.value) || 1920)}
              className="input text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Height</label>
            <input type="number" min={240} max={4320} value={customHeight}
              onChange={e => setCustomHeight(parseInt(e.target.value) || 1080)}
              className="input text-sm" />
          </div>
        </div>
      )}

      <label className="text-xs text-gray-400 mb-1 block mt-2">
        Grid Size: {gridSize}px
      </label>
      <input type="range" min={16} max={200} step={4} value={gridSize}
        onChange={e => setGridSize(parseInt(e.target.value))}
        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
      <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
        <span>Fine</span><span>Coarse</span>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`flex-1 btn text-xs py-1.5 flex items-center justify-center gap-1.5 ${showLabels ? 'btn-primary' : 'btn-secondary'}`}
        >
          {showLabels ? <Eye size={12} /> : <EyeOff size={12} />}
          Labels
        </button>
        <button
          onClick={() => setShowSafeZones(!showSafeZones)}
          className={`flex-1 btn text-xs py-1.5 flex items-center justify-center gap-1.5 ${showSafeZones ? 'btn-primary' : 'btn-secondary'}`}
        >
          {showSafeZones ? <Eye size={12} /> : <EyeOff size={12} />}
          Safe Zones
        </button>
      </div>
    </Section>
  );
}

// ─── Branding & Media ────────────────────────────────────────────

function BrandingSection() {
  const brandName = useStore(s => s.brandName);
  const setBrandName = useStore(s => s.setBrandName);
  const logo = useStore(s => s.logo);
  const setLogo = useStore(s => s.setLogo);
  const globalOverlay = useStore(s => s.globalOverlay);
  const setGlobalOverlay = useStore(s => s.setGlobalOverlay);
  const overlaySettings = useStore(s => s.overlaySettings);
  const setOverlaySettings = useStore(s => s.setOverlaySettings);

  const logoRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLInputElement>(null);

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => setLogo(img);
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleOverlay = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadeddata = () => { video.currentTime = 0; };
      video.onseeked = () => { setGlobalOverlay(video); };
      video.src = URL.createObjectURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => setGlobalOverlay(img);
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Section title="Branding" icon={<Tag size={16} />}>
      <input
        type="text"
        value={brandName}
        onChange={e => setBrandName(e.target.value)}
        placeholder="Brand name..."
        className="input text-sm mb-2"
      />

      <input ref={logoRef} type="file" accept="image/*" onChange={handleLogo} className="hidden" />
      <button
        onClick={() => logoRef.current?.click()}
        className="w-full btn btn-secondary text-xs py-2 flex items-center justify-center gap-1.5 mb-2"
      >
        <ImageIcon size={14} />
        {logo ? 'Change Logo' : 'Upload Logo'}
      </button>
      {logo && (
        <button
          onClick={() => setLogo(null)}
          className="w-full btn btn-secondary text-[10px] py-1 flex items-center justify-center gap-1 mb-2 text-red-400 hover:text-red-300"
        >
          <Trash2 size={10} /> Remove Logo
        </button>
      )}

      <input ref={overlayRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" onChange={handleOverlay} className="hidden" />
      <button
        onClick={() => overlayRef.current?.click()}
        className="w-full btn btn-secondary text-xs py-2 flex items-center justify-center gap-1.5 mb-1"
      >
        <Film size={14} />
        {globalOverlay ? 'Change Overlay' : 'Upload Overlay (img/video)'}
      </button>
      {globalOverlay && (
        <>
          <button
            onClick={() => setGlobalOverlay(null)}
            className="w-full btn btn-secondary text-[10px] py-1 flex items-center justify-center gap-1 mb-2 text-red-400 hover:text-red-300"
          >
            <Trash2 size={10} /> Remove Overlay
          </button>
          <div className="space-y-2 mt-1">
            {/* Position */}
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Position</label>
              <div className="grid grid-cols-3 gap-0.5">
                {LOGO_POSITIONS.map(p => (
                  <button key={p.id}
                    onClick={() => setOverlaySettings({ position: p.id })}
                    className={`py-1 rounded text-[10px] font-mono transition-all ${
                      overlaySettings.position === p.id
                        ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300'
                        : 'bg-gray-800/50 border border-gray-700 text-gray-500 hover:border-gray-500'
                    }`}
                  >{p.label}</button>
                ))}
              </div>
            </div>
            {/* Size */}
            <div>
              <label className="text-[10px] text-gray-500 flex justify-between">
                <span>Size</span><span>{overlaySettings.size}%</span>
              </label>
              <input type="range" min={5} max={200} value={overlaySettings.size}
                onChange={e => setOverlaySettings({ size: parseInt(e.target.value) })}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
            </div>
            {/* Opacity */}
            <div>
              <label className="text-[10px] text-gray-500 flex justify-between">
                <span>Opacity</span><span>{overlaySettings.opacity}%</span>
              </label>
              <input type="range" min={5} max={100} value={overlaySettings.opacity}
                onChange={e => setOverlaySettings({ opacity: parseInt(e.target.value) })}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
            </div>
            {/* Blend Mode */}
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Blend</label>
              <div className="grid grid-cols-2 gap-0.5">
                {BLEND_MODES.map(b => (
                  <button key={b.id}
                    onClick={() => setOverlaySettings({ blendMode: b.id })}
                    className={`py-1 rounded text-[10px] transition-all ${
                      overlaySettings.blendMode === b.id
                        ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                        : 'bg-gray-800/50 border border-gray-700 text-gray-500 hover:border-gray-500'
                    }`}
                  >{b.label}</button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </Section>
  );
}

// ─── Logo Settings ──────────────────────────────────────────────

function LogoSettingsSection() {
  const logo = useStore(s => s.logo);
  const logoSettings = useStore(s => s.logoSettings);
  const setLogoSettings = useStore(s => s.setLogoSettings);
  const [expanded, setExpanded] = useState(false);

  if (!logo) return null;

  return (
    <Section title="Logo Settings" icon={<Move size={16} />}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-xs text-gray-400 mb-2"
      >
        <span>Position & Appearance</span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {/* Position Grid - always visible */}
      <div className="grid grid-cols-3 gap-1 mb-3">
        {LOGO_POSITIONS.map(pos => (
          <button
            key={pos.id}
            onClick={() => setLogoSettings({ position: pos.id as LogoPosition })}
            className={`py-1.5 rounded text-[10px] font-bold transition-all ${
              logoSettings.position === pos.id
                ? 'bg-cyan-500 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {pos.label}
          </button>
        ))}
      </div>

      {expanded && (
        <div className="space-y-2.5">
          {/* Size */}
          <div>
            <label className="text-[10px] text-gray-500 flex justify-between">
              <span>Size</span><span>{logoSettings.size}%</span>
            </label>
            <input type="range" min={2} max={200} value={logoSettings.size}
              onChange={e => setLogoSettings({ size: parseInt(e.target.value) })}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
          </div>

          {/* Opacity */}
          <div>
            <label className="text-[10px] text-gray-500 flex justify-between">
              <span>Opacity</span><span>{logoSettings.opacity}%</span>
            </label>
            <input type="range" min={5} max={100} value={logoSettings.opacity}
              onChange={e => setLogoSettings({ opacity: parseInt(e.target.value) })}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
          </div>

          {/* Rotation */}
          <div>
            <label className="text-[10px] text-gray-500 flex justify-between">
              <span>Rotation</span><span>{logoSettings.rotation} deg</span>
            </label>
            <input type="range" min={0} max={360} value={logoSettings.rotation}
              onChange={e => setLogoSettings({ rotation: parseInt(e.target.value) })}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
          </div>

          {/* Padding */}
          <div>
            <label className="text-[10px] text-gray-500 flex justify-between">
              <span>Padding</span><span>{logoSettings.padding}px</span>
            </label>
            <input type="range" min={0} max={100} value={logoSettings.padding}
              onChange={e => setLogoSettings({ padding: parseInt(e.target.value) })}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
          </div>

          {/* Blend Mode */}
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Blend Mode</label>
            <select
              value={logoSettings.blendMode}
              onChange={e => setLogoSettings({ blendMode: e.target.value as GlobalCompositeOperation })}
              className="input text-xs"
            >
              {BLEND_MODES.map(b => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </Section>
  );
}

// ─── Logo Duplication ──────────────────────────────────────────

function LogoDuplicationSection() {
  const setup = useStore(s => s.resolumeSetup);
  const extraLogos = useStore(s => s.extraLogos);
  const addLogoInstance = useStore(s => s.addLogoInstance);
  const removeLogoInstance = useStore(s => s.removeLogoInstance);
  const updateLogoInstance = useStore(s => s.updateLogoInstance);
  const setLogoInstanceImage = useStore(s => s.setLogoInstanceImage);

  if (!setup) return null;

  return (
    <Section title="Extra Logos" icon={<Copy size={16} />}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            {extraLogos.length} / {MAX_LOGO_INSTANCES - 1} logos
          </span>
          <button
            onClick={addLogoInstance}
            disabled={extraLogos.length >= MAX_LOGO_INSTANCES - 1}
            className="btn btn-success py-1 px-2 text-[10px] flex items-center gap-1"
          >
            <Plus size={10} /> Add Logo
          </button>
        </div>

        {extraLogos.map((inst, idx) => (
          <LogoInstanceCard
            key={inst.id}
            inst={inst}
            idx={idx}
            onRemove={removeLogoInstance}
            onUpdate={updateLogoInstance}
            onSetImage={setLogoInstanceImage}
          />
        ))}
      </div>
    </Section>
  );
}

function LogoInstanceCard({ inst, idx, onRemove, onUpdate, onSetImage }: {
  inst: import('../types').LogoInstance;
  idx: number;
  onRemove: (id: string) => void;
  onUpdate: (id: string, s: Partial<import('../types').LogoSettings>) => void;
  onSetImage: (id: string, img: HTMLImageElement | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => onSetImage(inst.id, img);
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="bg-gray-800/50 rounded p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-300 font-medium">
          Logo {idx + 1} {inst.image ? '' : '(no image)'}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-200">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button onClick={() => onRemove(inst.id)} className="text-red-400 hover:text-red-300" title="Remove">
            <Minus size={12} />
          </button>
        </div>
      </div>

      {/* Image upload */}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        className={`w-full py-1.5 rounded text-[10px] flex items-center justify-center gap-1 transition-all ${
          inst.image
            ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
            : 'bg-gray-700 border border-dashed border-gray-500 text-gray-400 hover:border-gray-400'
        }`}
      >
        <ImageIcon size={10} />
        {inst.image ? 'Change image' : 'Upload image'}
      </button>
      {inst.image && (
        <button
          onClick={() => onSetImage(inst.id, null)}
          className="w-full text-[9px] text-red-400 hover:text-red-300 py-0.5"
        >
          Remove image (use main logo)
        </button>
      )}

      {/* Position Grid */}
      <div className="grid grid-cols-3 gap-0.5">
        {LOGO_POSITIONS.map(pos => (
          <button
            key={pos.id}
            onClick={() => onUpdate(inst.id, { position: pos.id as LogoPosition })}
            className={`py-1 rounded text-[9px] font-bold transition-all ${
              inst.settings.position === pos.id
                ? 'bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {pos.label}
          </button>
        ))}
      </div>

      {expanded && (
        <div className="space-y-1.5">
          {/* Size */}
          <div>
            <label className="text-[9px] text-gray-500 flex justify-between">
              <span>Size</span><span>{inst.settings.size}%</span>
            </label>
            <input type="range" min={2} max={200} value={inst.settings.size}
              onChange={e => onUpdate(inst.id, { size: parseInt(e.target.value) })}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
          </div>

          {/* Opacity */}
          <div>
            <label className="text-[9px] text-gray-500 flex justify-between">
              <span>Opacity</span><span>{inst.settings.opacity}%</span>
            </label>
            <input type="range" min={5} max={100} value={inst.settings.opacity}
              onChange={e => onUpdate(inst.id, { opacity: parseInt(e.target.value) })}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
          </div>

          {/* Rotation */}
          <div>
            <label className="text-[9px] text-gray-500 flex justify-between">
              <span>Rotation</span><span>{inst.settings.rotation}deg</span>
            </label>
            <input type="range" min={0} max={360} value={inst.settings.rotation}
              onChange={e => onUpdate(inst.id, { rotation: parseInt(e.target.value) })}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
          </div>

          {/* Padding */}
          <div>
            <label className="text-[9px] text-gray-500 flex justify-between">
              <span>Padding</span><span>{inst.settings.padding}px</span>
            </label>
            <input type="range" min={0} max={100} value={inst.settings.padding}
              onChange={e => onUpdate(inst.id, { padding: parseInt(e.target.value) })}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
          </div>

          {/* Blend Mode */}
          <div>
            <select
              value={inst.settings.blendMode}
              onChange={e => onUpdate(inst.id, { blendMode: e.target.value as GlobalCompositeOperation })}
              className="input text-[9px] w-full"
            >
              {BLEND_MODES.map(b => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Decorative Elements ──────────────────────────────────────

function DecorativeElementsSection() {
  const setup = useStore(s => s.resolumeSetup);
  const decorativeSettings = useStore(s => s.decorativeSettings);
  const setDecorativeSettings = useStore(s => s.setDecorativeSettings);

  if (!setup) return null;

  const toggleElement = (id: DecorativeElementType) => {
    const current = decorativeSettings.enabled;
    const next = current.includes(id)
      ? current.filter(e => e !== id)
      : [...current, id];
    setDecorativeSettings({ enabled: next });
  };

  return (
    <Section title="Decorative Elements" icon={<Sparkles size={16} />}>
      <div className="grid grid-cols-4 gap-1 mb-2">
        {DECORATIVE_ELEMENTS.map(elem => (
          <button
            key={elem.id}
            onClick={() => toggleElement(elem.id)}
            className={`py-1.5 px-1 rounded text-[9px] transition-all ${
              decorativeSettings.enabled.includes(elem.id)
                ? 'bg-pink-500/20 border border-pink-500/50 text-pink-300'
                : 'bg-gray-800/50 border border-gray-700 text-gray-500 hover:border-gray-500'
            }`}
            title={elem.name}
          >
            {elem.name}
          </button>
        ))}
      </div>

      {decorativeSettings.enabled.length > 0 && (
        <div className="space-y-2">
          {/* Density */}
          <div>
            <label className="text-[10px] text-gray-500 flex justify-between">
              <span>Density</span><span>{decorativeSettings.density}</span>
            </label>
            <input type="range" min={1} max={5} step={1} value={decorativeSettings.density}
              onChange={e => setDecorativeSettings({ density: parseInt(e.target.value) })}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500" />
          </div>

          {/* Size */}
          <div>
            <label className="text-[10px] text-gray-500 flex justify-between">
              <span>Size</span><span>{decorativeSettings.size}%</span>
            </label>
            <input type="range" min={50} max={200} step={10} value={decorativeSettings.size}
              onChange={e => setDecorativeSettings({ size: parseInt(e.target.value) })}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500" />
          </div>

          {/* Opacity */}
          <div>
            <label className="text-[10px] text-gray-500 flex justify-between">
              <span>Opacity</span><span>{decorativeSettings.opacity}%</span>
            </label>
            <input type="range" min={10} max={100} step={5} value={decorativeSettings.opacity}
              onChange={e => setDecorativeSettings({ opacity: parseInt(e.target.value) })}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500" />
          </div>

          {/* Animated toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={decorativeSettings.animated}
              onChange={e => setDecorativeSettings({ animated: e.target.checked })}
              className="accent-pink-500"
            />
            <span className="text-[10px] text-gray-400">Animate (floating)</span>
          </label>

          {decorativeSettings.animated && (
              <div>
                <label className="text-[10px] text-gray-500 flex justify-between">
                  <span>Anim Speed</span><span>{decorativeSettings.animSpeed || 1}x</span>
                </label>
                <input type="range" min={25} max={400} step={25} value={(decorativeSettings.animSpeed || 1) * 100}
                  onChange={e => setDecorativeSettings({ animSpeed: parseInt(e.target.value) / 100 })}
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500" />
              </div>
          )}
        </div>
      )}
    </Section>
  );
}

// ─── Animation Presets ──────────────────────────────────────────

function AnimationSection() {
  const logo = useStore(s => s.logo);
  const animationPreset = useStore(s => s.animationPreset);
  const setAnimationPreset = useStore(s => s.setAnimationPreset);
  const animationSpeed = useStore(s => s.animationSpeed);
  const setAnimationSpeed = useStore(s => s.setAnimationSpeed);

  if (!logo) return null;

  return (
    <Section title="Logo Animation" icon={<Sparkles size={16} />}>
      <div className="grid grid-cols-3 gap-1">
        {ANIMATION_PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => setAnimationPreset(p.id as AnimationPresetType)}
            className={`py-1.5 px-1 rounded text-[10px] transition-all ${
              animationPreset === p.id
                ? 'bg-pink-500/20 border border-pink-500/50 text-pink-300'
                : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
            title={p.description}
          >
            {p.name}
          </button>
        ))}
      </div>
      {animationPreset !== 'none' && (
        <div className="mt-2">
          <label className="text-[10px] text-gray-500 flex justify-between">
            <span>Speed</span><span>{animationSpeed}x</span>
          </label>
          <input type="range" min={25} max={400} step={25} value={animationSpeed * 100}
            onChange={e => setAnimationSpeed(parseInt(e.target.value) / 100)}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500" />
        </div>
      )}
    </Section>
  );
}

// ─── Presets ─────────────────────────────────────────────────────

function PresetSection() {
  const presets = useStore(s => s.savedPresets);
  const savePreset = useStore(s => s.savePreset);
  const loadPreset = useStore(s => s.loadPreset);
  const deletePreset = useStore(s => s.deletePreset);
  const importPresets = useStore(s => s.importPresets);
  const exportPresets = useStore(s => s.exportPresets);

  const importRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const name = prompt('Preset name:');
    if (name?.trim()) savePreset(name.trim());
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        importPresets(ev.target?.result as string);
      } catch {
        alert('Invalid preset file');
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const json = exportPresets();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rslm-presets.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Section title="Presets" icon={<Save size={16} />}>
      <div className="flex gap-2 mb-2">
        <button onClick={handleSave} className="flex-1 btn btn-primary text-xs py-1.5 flex items-center justify-center gap-1">
          <Save size={12} /> Save
        </button>
        <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        <button onClick={() => importRef.current?.click()} className="flex-1 btn btn-secondary text-xs py-1.5 flex items-center justify-center gap-1">
          <FolderOpen size={12} /> Import
        </button>
        <button onClick={handleExport} className="flex-1 btn btn-secondary text-xs py-1.5 flex items-center justify-center gap-1" disabled={presets.length === 0}>
          <Download size={12} /> Export
        </button>
      </div>

      {presets.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {presets.map(p => (
            <div key={p.name} className="flex items-center justify-between bg-gray-800/50 rounded px-2 py-1.5 text-xs">
              <button onClick={() => loadPreset(p)} className="text-gray-300 hover:text-white truncate flex-1 text-left">
                {p.name}
              </button>
              <button onClick={() => deletePreset(p.name)} className="text-gray-500 hover:text-red-400 ml-2 shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ─── Export ──────────────────────────────────────────────────────

function ExportSection() {
  const setup = useStore(s => s.resolumeSetup);
  const getDims = useStore(s => s.getOutputDimensions);
  const viewMode = useStore(s => s.viewMode);
  const animationPreset = useStore(s => s.animationPreset);
  const decorativeSettings = useStore(s => s.decorativeSettings);
  const isExporting = useStore(s => s.isExporting);

  if (!setup) return null;

  const dims = getDims();
  const label = viewMode === 'output' ? 'Out' : 'In';
  const hasAnimation = animationPreset !== 'none' || decorativeSettings.animated;

  return (
    <Section title="Export" icon={<Download size={16} />}>
      <button
        onClick={exportComposition}
        className="w-full btn btn-success flex items-center justify-center gap-2 py-2.5 text-sm font-semibold mb-1.5"
      >
        <Download size={16} />
        PNG ({label} {dims.width}x{dims.height})
      </button>

      {hasAnimation && (
        <button
          onClick={exportVideo}
          disabled={isExporting}
          className="w-full btn btn-primary flex items-center justify-center gap-2 py-2.5 text-sm font-semibold"
        >
          {isExporting ? (
            <><div className="spinner w-4 h-4" /> Rendering...</>
          ) : (
            <><Film size={16} /> MP4 5s loop ({label} {dims.width}x{dims.height})</>
          )}
        </button>
      )}
    </Section>
  );
}

// ─── Shared Section wrapper ─────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-3">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}
