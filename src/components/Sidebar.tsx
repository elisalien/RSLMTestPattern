import { useRef, useCallback } from 'react';
import {
  Upload, Download, Image as ImageIcon, Film, Grid3x3,
  Settings, Save, FolderOpen, Trash2, Eye, EyeOff, Tag,
} from 'lucide-react';
import { useStore } from '../store';
import { TEMPLATES, OUTPUT_RESOLUTIONS, TemplateType } from '../types';
import { exportComposition } from './Preview';

export function Sidebar() {
  const sidebarOpen = useStore(s => s.sidebarOpen);
  if (!sidebarOpen) return null;

  return (
    <aside className="w-80 bg-gray-900/95 border-r border-gray-700/50 overflow-y-auto shrink-0 flex flex-col">
      <div className="flex flex-col gap-1 p-3">
        <ImportSection />
        <TemplateSection />
        <SettingsSection />
        <BrandingSection />
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
          <div className="toggle-group w-full">
            <button
              onClick={() => setViewMode('output')}
              className={`toggle-btn flex-1 text-xs ${viewMode === 'output' ? 'active' : ''}`}
            >
              Output
            </button>
            <button
              onClick={() => setViewMode('input')}
              className={`toggle-btn flex-1 text-xs ${viewMode === 'input' ? 'active' : ''}`}
            >
              Input
            </button>
          </div>
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
      {/* Resolution */}
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

      {/* Grid Size */}
      <label className="text-xs text-gray-400 mb-1 block mt-2">
        Grid Size: {gridSize}px
      </label>
      <input type="range" min={16} max={200} step={4} value={gridSize}
        onChange={e => setGridSize(parseInt(e.target.value))}
        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
      <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
        <span>Fine</span><span>Coarse</span>
      </div>

      {/* Toggles */}
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
      // Video overlay: capture current frame
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadeddata = () => {
        video.currentTime = 0;
      };
      video.onseeked = () => {
        setGlobalOverlay(video);
      };
      video.src = URL.createObjectURL(file);
    } else {
      // Image overlay
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

      <input ref={overlayRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" onChange={handleOverlay} className="hidden" />
      <button
        onClick={() => overlayRef.current?.click()}
        className="w-full btn btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
      >
        <Film size={14} />
        {globalOverlay ? 'Change Overlay' : 'Upload Overlay (img/video)'}
      </button>
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

  if (!setup) return null;

  const dims = getDims();

  return (
    <Section title="Export" icon={<Download size={16} />}>
      <button
        onClick={exportComposition}
        className="w-full btn btn-success flex items-center justify-center gap-2 py-3 text-sm font-semibold"
      >
        <Download size={18} />
        Export PNG ({viewMode === 'output' ? 'Out' : 'In'} {dims.width}x{dims.height})
      </button>
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
