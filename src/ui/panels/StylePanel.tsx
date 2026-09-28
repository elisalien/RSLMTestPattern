import { useRef, useState } from 'react';
import { Download, Trash2, Upload, RotateCcw } from 'lucide-react';
import { useStore, defaultScene } from '../../state/store';
import { THEMES } from '../../render/themes';
import { PanelHead, TextInput, Toggle } from '../controls';
import { patternThumb } from '../thumbs';
import { download } from '../../export/exporter';

export function StylePanel() {
  const scene = useStore(s => s.scene);
  const setScene = useStore(s => s.setScene);
  return (
    <>
      <PanelHead title="Style" sub="Thème graphique, titre et fond." />
      <div className="panel-body">
        <TextInput label="Titre du show" value={scene.showTitle} placeholder="Ex. Lou! Sonata — Salle 2" onChange={v => setScene({ showTitle: v })}
          help="Apparaît dans la carte d’info, le texte défilant et le nom des fichiers exportés." />
        <Toggle label="Fond transparent" on={scene.transparentBg} onChange={v => setScene({ transparentBg: v })}
          help="Avec la mire « Fond seul » : seuls repères, logos et animations sont exportés, avec alpha (PNG, HAP Alpha, ProRes 4444). À poser en couche par-dessus un contenu dans Resolume." />
        <div className="group-title">Thème</div>
        <div className="gallery">
          {THEMES.map(t => (
            <button key={t.id} className={`tile ${t.id === scene.themeId ? 'on' : ''}`} onClick={() => setScene({ themeId: t.id })} title={t.desc}>
              <img src={patternThumb('mapping-id', t.id)} alt="" />
              <span>{t.name}<br /><small className="muted">{t.desc}</small></span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export function PresetsPanel() {
  const presets = useStore(s => s.presets);
  const save = useStore(s => s.savePreset);
  const apply = useStore(s => s.applyPreset);
  const del = useStore(s => s.deletePreset);
  const exportPresets = useStore(s => s.exportPresets);
  const importPresets = useStore(s => s.importPresets);
  const setScene = useStore(s => s.setScene);
  const toast = useStore(s => s.toast);
  const [name, setName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <PanelHead title="Presets" sub="Sauvegarde mire + repères + animations + logos. Le setup XML reste à part." />
      <div className="panel-body">
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input className="text" value={name} placeholder="Nom du preset" onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && name.trim()) { save(name.trim()); setName(''); } }} />
          <button className="btn primary" disabled={!name.trim()} onClick={() => { save(name.trim()); setName(''); }}>Enregistrer</button>
        </div>
        {!presets.length && <div className="muted">Aucun preset pour l’instant.</div>}
        {presets.map(p => (
          <div key={p.name} className="card">
            <div className="card-head">
              <div className="title">{p.name}<span className="sub">{new Date(p.savedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} · {p.scene.patternId} · {p.scene.logos.length} logo(s)</span></div>
              <button className="btn small" onClick={() => apply(p)}>Charger</button>
              <button className="icon-btn" title="Supprimer" onClick={() => { if (confirm(`Supprimer le preset « ${p.name} » ?`)) del(p.name); }}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
        <div className="row">
          <button className="btn" disabled={!presets.length} onClick={async () => download(new Blob([await exportPresets()], { type: 'application/json' }), 'mires-resolume-presets.json')}><Download size={15} /> Exporter (avec logos)</button>
          <button className="btn" onClick={() => fileRef.current?.click()}><Upload size={15} /> Importer</button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={async e => {
            const f = e.target.files?.[0]; e.target.value = '';
            if (!f) return;
            try { const n = await importPresets(await f.text()); toast('ok', `${n} preset(s) importé(s).`); }
            catch (err) { toast('error', (err as Error).message); }
          }} />
        </div>
        <div className="group-title">Remise à zéro</div>
        <button className="btn danger" onClick={() => { if (confirm('Remettre mire, repères, animations et logos par défaut ? (les presets et la bibliothèque de logos sont gardés)')) setScene(defaultScene()); }}>
          <RotateCcw size={15} /> Réglages par défaut
        </button>
      </div>
    </>
  );
}
