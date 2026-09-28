import { Component, ReactNode, useEffect, useState } from 'react';
import { Download, Film, Grid3x3, Image as ImageIcon, LayoutPanelLeft, Monitor, Palette, Pause, Play, Ruler, Save, X } from 'lucide-react';
import { useStore } from './state/store';
import { isAnimated } from './render/engine';
import { Stage } from './ui/Stage';
import { Seg } from './ui/controls';
import { SetupPanel, readXmlFile } from './ui/panels/SetupPanel';
import { PatternPanel } from './ui/panels/PatternPanel';
import { AnimPanel, OverlaysPanel } from './ui/panels/LayersPanel';
import { LogosPanel, addLogoFiles } from './ui/panels/LogosPanel';
import { PresetsPanel, StylePanel } from './ui/panels/StylePanel';
import { ExportPanel } from './ui/panels/ExportPanel';

const TABS = [
  { id: 'setup', label: 'Setup', icon: Monitor, panel: SetupPanel },
  { id: 'mire', label: 'Mire', icon: Grid3x3, panel: PatternPanel },
  { id: 'reperes', label: 'Repères', icon: Ruler, panel: OverlaysPanel },
  { id: 'anim', label: 'Animation', icon: Film, panel: AnimPanel },
  { id: 'logos', label: 'Logos', icon: ImageIcon, panel: LogosPanel },
  { id: 'style', label: 'Style', icon: Palette, panel: StylePanel },
  { id: 'presets', label: 'Presets', icon: Save, panel: PresetsPanel },
  { id: 'export', label: 'Export', icon: Download, panel: ExportPanel },
];

class Boundary extends Component<{ children: ReactNode; name: string }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error) { console.error(err); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="panel-body">
        <div className="note warn-box">⚠ Le panneau « {this.props.name} » a planté : {this.state.err.message}</div>
        <button className="btn" onClick={() => this.setState({ err: null })}>Réessayer</button>
      </div>
    );
  }
}

export default function App() {
  const setup = useStore(s => s.setup);
  const scene = useStore(s => s.scene);
  const view = useStore(s => s.view);
  const setView = useStore(s => s.setView);
  const screenId = useStore(s => s.screenId);
  const setScreen = useStore(s => s.setScreen);
  const prefs = useStore(s => s.prefs);
  const setPrefs = useStore(s => s.setPrefs);
  const playing = useStore(s => s.playing);
  const setPlaying = useStore(s => s.setPlaying);
  const toasts = useStore(s => s.toasts);
  const dismiss = useStore(s => s.dismiss);
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);

  const tab = TABS.find(t => t.id === prefs.tab) || TABS[1];
  const Panel = tab.panel;
  const animated = isAnimated(scene);
  const nSlices = setup.screens.reduce((n, s) => n + s.slices.length, 0);
  const counts: Record<string, number> = {
    reperes: Object.values(scene.overlays).filter(o => o.enabled).length,
    anim: Object.values(scene.anims).filter(o => o.enabled).length,
    logos: scene.logos.filter(l => l.enabled).length,
  };

  // Drop anywhere: XML → setup, images → logos
  useEffect(() => {
    let depth = 0;
    const enter = (e: DragEvent) => { if (e.dataTransfer?.types.includes('Files')) { depth++; setDragging(true); } };
    const leave = () => { depth = Math.max(0, depth - 1); if (!depth) setDragging(false); };
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault(); depth = 0; setDragging(false);
      const files = Array.from(e.dataTransfer?.files || []);
      const xml = files.find(f => /\.xml$/i.test(f.name));
      if (xml) { readXmlFile(xml); setPrefs({ tab: 'setup' }); }
      const imgs = files.filter(f => /^image\//.test(f.type) || /\.svg$/i.test(f.name));
      if (imgs.length) addLogoFiles(imgs);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, [setPrefs]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><span className="brand-mark" /> Mires Resolume</div>
        <div className="setup-chip">
          <b>{setup.name}</b>
          <span>{setup.comp.w} × {setup.comp.h} · {setup.screens.length} écran(s) · {nSlices} slice(s)</span>
        </div>
        <span className="spacer" />
        <Seg value={view} onChange={setView} options={[
          { value: 'input', label: 'Composition', title: 'Ce que Resolume joue (Advanced Input)' },
          { value: 'output', label: 'Sortie écran', title: 'Ce que reçoit chaque écran (Advanced Output)' },
        ]} />
        {view === 'output' && (
          <select className="select" style={{ width: 'auto', maxWidth: 240 }} value={screenId} onChange={e => setScreen(e.target.value)} aria-label="Écran">
            {setup.screens.map(s => <option key={s.id} value={s.id}>{s.name} · {s.size.w}×{s.size.h}</option>)}
          </select>
        )}
        {view === 'output' && (
          <label className="row muted" style={{ gap: 6, cursor: 'pointer' }} title="Contours des slices en sortie (aperçu seulement)">
            <input type="checkbox" checked={prefs.guides} onChange={e => setPrefs({ guides: e.target.checked })} /> Contours
          </label>
        )}
        <span className="spacer" />
        <select className="select" style={{ width: 'auto' }} value={prefs.quality} onChange={e => setPrefs({ quality: e.target.value as typeof prefs.quality })} title="Résolution de l’aperçu (l’export est toujours en pleine qualité)" aria-label="Qualité d’aperçu">
          <option value="auto">Aperçu auto</option>
          <option value="1">Aperçu 100 %</option>
          <option value="0.5">Aperçu 50 %</option>
          <option value="0.25">Aperçu 25 %</option>
        </select>
        <button className="btn" disabled={!animated} onClick={() => setPlaying(!playing)} title="Lecture / pause (Espace)">
          {playing ? <Pause size={16} /> : <Play size={16} />} {playing ? 'Pause' : 'Lecture'}
        </button>
        <button className="btn primary" onClick={() => setPrefs({ tab: 'export' })}><Download size={16} /> Exporter</button>
      </header>

      <div className={`body ${collapsed ? 'collapsed' : ''}`}>
        <nav className="rail" aria-label="Sections">
          {TABS.map(t => (
            <button key={t.id} className={t.id === tab.id && !collapsed ? 'on' : ''} onClick={() => { if (t.id === tab.id) setCollapsed(!collapsed); else { setPrefs({ tab: t.id }); setCollapsed(false); } }}>
              <t.icon size={20} />
              {t.label}
              {counts[t.id] ? <span className="badge">{counts[t.id]}</span> : null}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <button onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Afficher le panneau' : 'Masquer le panneau'}><LayoutPanelLeft size={18} />{collapsed ? 'Ouvrir' : 'Plein écran'}</button>
        </nav>
        <section className="panel">
          <Boundary name={tab.label} key={tab.id}><Panel /></Boundary>
        </section>
        <Stage />
      </div>

      {dragging && <div className="drop-overlay">Dépose un XML Resolume ou des logos</div>}
      <div className="toasts" role="status">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span>{t.kind === 'error' || t.kind === 'warn' ? '⚠ ' : ''}{t.text}</span>
            <button className="icon-btn x" onClick={() => dismiss(t.id)} aria-label="Fermer"><X size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
