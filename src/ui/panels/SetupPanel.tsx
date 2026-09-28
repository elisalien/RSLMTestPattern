import { useRef, useState } from 'react';
import { FileUp, Monitor, RotateCcw, Eye } from 'lucide-react';
import { useStore } from '../../state/store';
import { PanelHead, Seg, Slider, Switch, TextInput } from '../controls';
import { sliceHsl, themeById } from '../../render/themes';
import { ratioLabel } from '../../core/geometry';

const SIZES = [
  { label: '1920 × 1080', w: 1920, h: 1080 },
  { label: '3840 × 2160', w: 3840, h: 2160 },
  { label: '1920 × 1200', w: 1920, h: 1200 },
  { label: '2560 × 1440', w: 2560, h: 1440 },
  { label: '1500 × 1200', w: 1500, h: 1200 },
  { label: '1280 × 720', w: 1280, h: 720 },
];

export function readXmlFile(file: File) {
  const reader = new FileReader();
  reader.onload = () => useStore.getState().loadXML(String(reader.result || ''), file.name);
  reader.readAsText(file);
}

export function SetupPanel() {
  const setup = useStore(s => s.setup);
  const xml = useStore(s => s.xml);
  const disabled = useStore(s => s.disabled);
  const toggleSlice = useStore(s => s.toggleSlice);
  const setSlicesEnabled = useStore(s => s.setSlicesEnabled);
  const setView = useStore(s => s.setView);
  const setScreen = useStore(s => s.setScreen);
  const prefs = useStore(s => s.prefs);
  const setPrefs = useStore(s => s.setPrefs);
  const newManual = useStore(s => s.newManual);
  const resetSetup = useStore(s => s.resetSetup);
  const themeId = useStore(s => s.scene.themeId);
  const theme = themeById(themeId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [mode, setMode] = useState<'xml' | 'manual'>(setup.origin === 'manual' ? 'manual' : 'xml');
  const [m, setM] = useState({ name: 'Setup manuel', w: 1920, h: 1080, cols: 1, rows: 1, gap: 0 });

  const off = new Set(disabled);
  const shown = (id: string) => prefs.inputScreens === 'all' || prefs.inputScreens.includes(id);
  const toggleShown = (id: string) => {
    const all = setup.screens.map(s => s.id);
    const cur = prefs.inputScreens === 'all' ? all : prefs.inputScreens;
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    setPrefs({ inputScreens: next.length === all.length ? 'all' : next });
  };

  return (
    <>
      <PanelHead title="Setup" sub="Importe l’Advanced Output de Resolume ou crée un setup à la main." />
      <div className="panel-body">
        <Seg full value={mode} onChange={setMode} options={[{ value: 'xml', label: 'XML Resolume' }, { value: 'manual', label: 'Manuel' }]} />

        {mode === 'xml' ? (
          <div
            className={`dropzone ${over ? 'over' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); setOver(false); const f = e.dataTransfer.files[0]; if (f) readXmlFile(f); }}
          >
            <FileUp size={22} /><br />
            <b>Choisir un XML</b> ou le glisser ici
            <div className="muted" style={{ marginTop: 6 }}>Resolume : Output › Advanced Output › Presets › Save / Export.<br />Dossier habituel : Documents\Resolume Arena\Presets\Advanced Output</div>
            <input ref={fileRef} type="file" accept=".xml,text/xml" hidden onChange={e => { const f = e.target.files?.[0]; if (f) readXmlFile(f); e.target.value = ''; }} />
          </div>
        ) : (
          <div className="card"><div className="card-body flat" style={{ paddingTop: 12 }}>
            <TextInput label="Nom" value={m.name} onChange={v => setM({ ...m, name: v })} />
            <div className="row" style={{ gap: 6 }}>
              {SIZES.map(s => <button key={s.label} className={`btn small ${m.w === s.w && m.h === s.h ? 'primary' : ''}`} onClick={() => setM({ ...m, w: s.w, h: s.h })}>{s.label}</button>)}
            </div>
            <div className="grid2">
              <Slider label="Largeur" value={m.w} min={64} max={16384} step={1} unit="px" onChange={v => setM({ ...m, w: Math.round(v) })} />
              <Slider label="Hauteur" value={m.h} min={64} max={16384} step={1} unit="px" onChange={v => setM({ ...m, h: Math.round(v) })} />
              <Slider label="Colonnes" value={m.cols} min={1} max={32} onChange={v => setM({ ...m, cols: Math.round(v) })} />
              <Slider label="Lignes" value={m.rows} min={1} max={32} onChange={v => setM({ ...m, rows: Math.round(v) })} />
            </div>
            <Slider label="Espace entre slices" value={m.gap} min={0} max={200} unit="px" onChange={v => setM({ ...m, gap: Math.round(v) })} help="Pour des écrans séparés physiquement dans une même composition." />
            <button className="btn primary wide" onClick={() => newManual(m)}>Créer ce setup</button>
          </div></div>
        )}

        <div className="card">
          <div className="card-head">
            <div className="title">{setup.name}<span className="sub">{setup.version}{xml ? ` · ${xml.name}` : ''}</span></div>
            {setup.origin !== 'demo' && <button className="icon-btn" title="Revenir à la démo" onClick={resetSetup}><RotateCcw size={16} /></button>}
          </div>
          <div className="card-body">
            <div className="muted">Composition <b style={{ color: 'var(--text)' }}>{setup.comp.w} × {setup.comp.h}</b> · {ratioLabel(setup.comp.w, setup.comp.h)}</div>
            {setup.warnings.map((w, i) => <div key={i} className="warn">⚠ {w}</div>)}
          </div>
        </div>

        <div className="group-title">Écrans et slices</div>
        {setup.screens.map(sc => {
          const ids = sc.slices.map(s => s.id);
          const allOn = ids.every(id => !off.has(id));
          return (
            <div key={sc.id} className={`card ${shown(sc.id) ? '' : ''}`}>
              <div className="card-head">
                <Monitor size={18} />
                <div className="title">{sc.name}{!sc.enabled && <span className="warn"> (désactivé dans Resolume)</span>}
                  <span className="sub">{sc.device.type} « {sc.device.name} » · {sc.size.w} × {sc.size.h}</span>
                </div>
                <button className="icon-btn" title="Voir la sortie de cet écran" onClick={() => { setScreen(sc.id); setView('output'); }}><Eye size={16} /></button>
              </div>
              <div className="card-body">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <label className="row muted" style={{ gap: 8, cursor: 'pointer' }}>
                    <Switch on={shown(sc.id)} onChange={() => toggleShown(sc.id)} label="Afficher dans la composition" />
                    Dans la composition
                  </label>
                  <button className="btn small ghost" onClick={() => setSlicesEnabled(ids, !allOn)}>{allOn ? 'Tout couper' : 'Tout allumer'}</button>
                </div>
                <div className="slices">
                  {sc.slices.map(sl => (
                    <div key={sl.id} className={`slice-row ${off.has(sl.id) ? 'off' : ''}`}>
                      <span className="n">{sl.index + 1}</span>
                      <span className="dot" style={{ background: sliceHsl(theme, sl.index) }} />
                      <span className="name">{sl.name}{sl.kind === 'polygon' && <span className="muted"> · polygone</span>}{sl.twins.length > 0 && <span className="muted" title="Même zone d’entrée qu’une slice d’un autre écran"> · partagée</span>}{!sl.enabled && <span className="warn"> · coupée dans Resolume</span>}</span>
                      <span className="dim">{Math.round(sl.frame.w)}×{Math.round(sl.frame.h)}{sl.frame.angle ? ` ${Math.round(sl.frame.angle * 180 / Math.PI)}°` : ''}{sl.lattice ? ' ⌗' : ''}</span>
                      <Switch on={!off.has(sl.id)} onChange={() => toggleSlice(sl.id)} label={`Slice ${sl.name}`} />
                    </div>
                  ))}
                  {!sc.slices.length && <div className="muted">Aucune slice.</div>}
                </div>
              </div>
            </div>
          );
        })}
        <div className="muted">⌗ = slice déformée (warp / corner pin) : la vue « Sortie » applique la déformation.</div>
      </div>
    </>
  );
}
