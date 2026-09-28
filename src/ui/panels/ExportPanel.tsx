import { useEffect, useRef, useState } from 'react';
import { Film, FolderOpen, Image as ImageIcon, RefreshCw, X } from 'lucide-react';
import { useStore } from '../../state/store';
import { CODECS, ExportContext, Progress, ServerHealth, buildItems, exportBaseName, exportPNG, exportVideo, serverHealth } from '../../export/exporter';
import { isAnimated } from '../../render/engine';
import { Field, PanelHead, Seg, Slider } from '../controls';

const fmtSize = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(2)} Go` : `${(b / 1e6).toFixed(1)} Mo`);

export function ExportPanel() {
  const st = useStore();
  const { exportPrefs: ep, setExportPrefs, scene } = st;
  const [health, setHealth] = useState<ServerHealth | null | undefined>(undefined);
  const [busy, setBusy] = useState<Progress | null>(null);
  const [result, setResult] = useState<{ name: string; path?: string; size: number }[] | null>(null);
  const abort = useRef<AbortController | null>(null);

  const check = () => { setHealth(undefined); serverHealth().then(setHealth); };
  useEffect(check, []);

  const ctx: ExportContext = { setup: st.setup, scene, disabled: st.disabled, view: st.view, screenId: st.screenId, inputScreens: st.prefs.inputScreens };
  const items = buildItems(ctx, ep.what, ep.scale);
  const serverCodecs = health?.ffmpeg ? health.encoders : [];
  const codec = CODECS.find(c => c.id === ep.codec) || CODECS[CODECS.length - 1];
  const codecOk = codec.where === 'browser' || serverCodecs.includes(codec.id);
  const frames = Math.round(scene.fps * scene.loopSeconds);
  const animated = isAnimated(scene);
  const alphaMismatch = scene.transparentBg && !codec.alpha;

  const runPNG = async () => {
    try { await exportPNG(items, 0, `${exportBaseName(ctx)}_${scene.patternId}`); st.toast('ok', `${items.length} image(s) exportée(s).`); }
    catch (e) { st.toast('error', (e as Error).message); }
  };

  const runVideo = async () => {
    abort.current = new AbortController();
    setResult(null);
    setBusy({ item: 0, items: items.length, frame: 0, frames: frames * ep.loops, label: 'Préparation…' });
    try {
      const r = await exportVideo(items, { codec: codec.id, fps: scene.fps, frames, loops: ep.loops, alpha: scene.transparentBg }, setBusy, abort.current.signal);
      setResult(r.files);
      st.toast('ok', `${r.files.length} vidéo(s) prête(s).`);
    } catch (e) {
      const err = e as Error;
      st.toast(err.name === 'AbortError' ? 'warn' : 'error', err.name === 'AbortError' ? 'Export annulé.' : err.message);
    } finally {
      setBusy(null);
      abort.current = null;
    }
  };

  const pct = busy ? ((busy.item + busy.frame / Math.max(1, busy.frames)) / busy.items) * 100 : 0;

  return (
    <>
      <PanelHead title="Export" sub="Images PNG ou vidéo en boucle, prêtes pour Resolume." />
      <div className="panel-body">
        <Field label="Quoi">
          <Seg full value={ep.what} onChange={v => setExportPrefs({ what: v })} options={[
            { value: 'view', label: 'Vue' }, { value: 'comp', label: 'Compo' }, { value: 'screens', label: 'Écrans' }, { value: 'slices', label: 'Slices' },
          ]} />
        </Field>
        <div className="muted">
          {ep.what === 'view' && (st.view === 'output' ? 'La sortie de l’écran affiché (déformation comprise).' : 'La composition : à lancer comme clip dans Resolume.')}
          {ep.what === 'comp' && 'La composition entière : le clip à jouer dans Resolume.'}
          {ep.what === 'screens' && 'Un fichier par écran de sortie, à sa résolution.'}
          {ep.what === 'slices' && 'Un fichier par slice, recadré (et redressé si tourné).'}
        </div>
        <Field label="Échelle">
          <Seg full value={String(ep.scale)} onChange={v => setExportPrefs({ scale: Number(v) })} options={['0.25', '0.5', '1', '2'].map(v => ({ value: v, label: `${Number(v) * 100} %` }))} />
        </Field>
        <div className="card"><div className="card-body flat" style={{ paddingTop: 10 }}>
          {items.slice(0, 6).map(it => <div key={it.name} className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><span style={{ overflowWrap: 'anywhere' }}>{it.name}</span><span className="value muted">{it.w}×{it.h}</span></div>)}
          {items.length > 6 && <div className="muted">… et {items.length - 6} autre(s)</div>}
          {!items.length && <div className="warn">⚠ Rien à exporter (aucune slice active).</div>}
        </div></div>

        <button className="btn primary wide" disabled={!items.length || !!busy} onClick={runPNG}><ImageIcon size={16} /> Exporter en PNG{items.length > 1 ? ' (ZIP)' : ''}</button>

        <div className="group-title">Vidéo en boucle</div>
        {!animated && <div className="note">Aucune animation active : la vidéo sera une image fixe. Active des animations dans l’onglet « Animation ».</div>}
        <Field label="Codec" help="DXV, HAP et ProRes passent par ffmpeg sur ce PC (version locale). MP4 navigateur marche partout mais demande plus de ressources en live.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {CODECS.map(c => {
              const ok = c.where === 'browser' || serverCodecs.includes(c.id);
              return (
                <button key={c.id} className={`card ${c.id === codec.id ? 'on' : ''}`} style={{ textAlign: 'left', cursor: ok ? 'pointer' : 'not-allowed', opacity: ok ? 1 : 0.5, padding: '7px 10px' }}
                  onClick={() => ok && setExportPrefs({ codec: c.id })} disabled={!ok}>
                  <b>{c.name}</b>{c.alpha && <span className="muted"> · alpha</span>}<br /><span className="muted">{c.desc}</span>
                </button>
              );
            })}
          </div>
        </Field>
        {health === undefined && <div className="muted">Recherche du serveur local…</div>}
        {health === null && (
          <div className="note">
            DXV / HAP / ProRes : lance la version locale (ffmpeg requis), puis recharge :
            <pre style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 12.5 }}>npm run local</pre>
          </div>
        )}
        {health && !health.ffmpeg && <div className="note warn-box">⚠ Serveur local trouvé mais pas ffmpeg. Installe-le (winget install ffmpeg) puis relance.</div>}
        {health?.ffmpeg && <div className="muted">ffmpeg prêt · fichiers dans <b style={{ color: 'var(--text)', overflowWrap: 'anywhere' }}>{health.outDir}</b> <button className="icon-btn" title="Revérifier" onClick={check}><RefreshCw size={13} /></button></div>}

        <Slider label="Nombre de boucles dans le fichier" value={ep.loops} min={1} max={20} onChange={v => setExportPrefs({ loops: Math.round(v) })} help="1 suffit : Resolume boucle le clip. Plus de boucles = fichier plus long." />
        <div className="muted">{items.length} fichier(s) · {(scene.loopSeconds * ep.loops).toFixed(1)} s · {scene.fps} i/s · {frames * ep.loops} images</div>
        {alphaMismatch && <div className="warn">⚠ Fond transparent : choisis HAP Alpha ou ProRes 4444 pour garder la transparence.</div>}
        {!codecOk && <div className="warn">⚠ Ce codec n’est pas disponible ici.</div>}
        {['dxv', 'hap', 'hapq', 'hapa'].includes(codec.id) && items.some(it => it.w % 4 || it.h % 4) && (
          <div className="muted">Info : DXV et HAP demandent des tailles multiples de 4. Une bande noire de 1 à 3 px est ajoutée à droite ou en bas si besoin.</div>
        )}

        {busy ? (
          <div className="card"><div className="card-body flat" style={{ paddingTop: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>{busy.items > 1 ? `Fichier ${busy.item + 1}/${busy.items} · ` : ''}{busy.label}</span><span className="value">{Math.round(pct)} %</span></div>
            <div className="progress"><div style={{ width: `${pct}%` }} /></div>
            <button className="btn danger" onClick={() => abort.current?.abort()}><X size={15} /> Annuler</button>
          </div></div>
        ) : (
          <button className="btn primary wide" disabled={!items.length || !codecOk} onClick={runVideo}><Film size={16} /> Exporter la vidéo ({codec.name})</button>
        )}

        {result && (
          <div className="card"><div className="card-body flat" style={{ paddingTop: 10 }}>
            {result.map(f => (
              <div key={f.name} className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                <span style={{ overflowWrap: 'anywhere' }}>✓ {f.name}</span><span className="value muted">{fmtSize(f.size)}</span>
              </div>
            ))}
            {result.some(f => f.path) && (
              <button className="btn" onClick={() => fetch('/api/reveal', { method: 'POST', body: JSON.stringify({ name: result[0].name }) })}><FolderOpen size={15} /> Ouvrir le dossier</button>
            )}
          </div></div>
        )}
      </div>
    </>
  );
}
