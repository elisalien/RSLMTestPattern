import { RotateCcw, Play, Pause } from 'lucide-react';
import { useStore } from '../../state/store';
import { OVERLAYS } from '../../render/overlays';
import { ANIMS } from '../../render/anims';
import { withDefaults } from '../../render/patterns';
import { LayerDef } from '../../core/types';
import { PanelHead, ParamsEditor, Seg, Slider, Switch } from '../controls';

function LayerCard({ kind, def }: { kind: 'overlays' | 'anims'; def: LayerDef }) {
  const st = useStore(s => s.scene[kind][def.id]);
  const setLayer = useStore(s => s.setLayer);
  const reset = useStore(s => s.resetLayer);
  if (!st) return null;
  return (
    <div className={`card ${st.enabled ? 'on' : ''}`}>
      <div className="card-head">
        <div className="title" onClick={() => setLayer(kind, def.id, { enabled: !st.enabled })} style={{ cursor: 'pointer' }}>
          {def.name}<span className="sub">{def.desc}</span>
        </div>
        <Switch on={st.enabled} onChange={v => setLayer(kind, def.id, { enabled: v })} label={def.name} />
      </div>
      {st.enabled && def.params.length > 0 && (
        <div className="card-body">
          <ParamsEditor defs={def} values={withDefaults(def, st.params)} onChange={(k, v) => setLayer(kind, def.id, { key: k, value: v })} />
          <button className="btn small ghost" style={{ alignSelf: 'flex-start' }} onClick={() => reset(kind, def.id)}><RotateCcw size={14} /> Réglages d’origine</button>
        </div>
      )}
    </div>
  );
}

export function OverlaysPanel() {
  return (
    <>
      <PanelHead title="Repères pro" sub="Outils de lecture d’écran : bords, zones, règles, étiquettes. Cumulables." />
      <div className="panel-body">
        <div className="group-title">Sur chaque slice</div>
        {OVERLAYS.filter(o => o.scope === 'slice').map(o => <LayerCard key={o.id} kind="overlays" def={o} />)}
        <div className="group-title">Sur la composition</div>
        {OVERLAYS.filter(o => o.scope === 'comp').map(o => <LayerCard key={o.id} kind="overlays" def={o} />)}
      </div>
    </>
  );
}

export function AnimPanel() {
  const scene = useStore(s => s.scene);
  const setScene = useStore(s => s.setScene);
  const playing = useStore(s => s.playing);
  const setPlaying = useStore(s => s.setPlaying);
  const frames = Math.round(scene.fps * scene.loopSeconds);
  return (
    <>
      <PanelHead title="Animation" sub="Tout boucle parfaitement : chaque mouvement fait un nombre entier de cycles par boucle." />
      <div className="panel-body">
        <div className="card">
          <div className="card-body flat" style={{ paddingTop: 12 }}>
            <Slider label="Durée de la boucle" value={scene.loopSeconds} min={0.5} max={60} step={0.5} unit="s" onChange={v => setScene({ loopSeconds: Math.max(0.5, v) })} />
            <div className="field">
              <span className="label">Images par seconde</span>
              <Seg full value={String(scene.fps)} onChange={v => setScene({ fps: Number(v) })} options={['24', '25', '30', '50', '60'].map(v => ({ value: v, label: v }))} />
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">{frames} images par boucle</span>
              <button className="btn small" onClick={() => setPlaying(!playing)}>{playing ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Lecture</>}</button>
            </div>
            <div className="muted">Astuce : cadence identique à la composition Resolume (souvent 30 ou 60).</div>
          </div>
        </div>
        <div className="group-title">Tests de mouvement</div>
        {ANIMS.filter(a => ['sweep', 'counter', 'flash', 'chase', 'clock', 'scroll', 'bounce'].includes(a.id)).map(a => <LayerCard key={a.id} kind="anims" def={a} />)}
        <div className="group-title">Habillage</div>
        {ANIMS.filter(a => !['sweep', 'counter', 'flash', 'chase', 'clock', 'scroll', 'bounce'].includes(a.id)).map(a => <LayerCard key={a.id} kind="anims" def={a} />)}
      </div>
    </>
  );
}
