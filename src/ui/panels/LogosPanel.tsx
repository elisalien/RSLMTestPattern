import { useRef, useState, useSyncExternalStore } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, ImagePlus, Trash2 } from 'lucide-react';
import { useStore } from '../../state/store';
import { assets } from '../../state/assets';
import { ANCHORS } from '../../render/logos';
import { LogoAnim, LogoLayer } from '../../core/types';
import { ColorInput, Field, PanelHead, Seg, Select, Slider, Switch, Toggle } from '../controls';
import { activeSlices } from '../../render/engine';

const BLENDS: { value: GlobalCompositeOperation; label: string }[] = [
  { value: 'source-over', label: 'Normal' }, { value: 'screen', label: 'Écran (éclaircir)' }, { value: 'lighter', label: 'Addition' },
  { value: 'multiply', label: 'Produit (assombrir)' }, { value: 'overlay', label: 'Incrustation' }, { value: 'difference', label: 'Différence' },
  { value: 'exclusion', label: 'Exclusion' },
];
const ANIMS: { value: LogoAnim; label: string }[] = [
  { value: 'none', label: 'Fixe' }, { value: 'pulse', label: 'Pulsation' }, { value: 'float', label: 'Flottement' },
  { value: 'rotate', label: 'Rotation' }, { value: 'flip', label: 'Retournement' }, { value: 'bounce', label: 'Rebond' },
  { value: 'orbit', label: 'Orbite' }, { value: 'fade', label: 'Fondu' }, { value: 'dvd', label: 'DVD (rebond sur les bords)' },
  { value: 'glitch', label: 'Glitch' },
];

export async function addLogoFiles(files: FileList | File[]) {
  const st = useStore.getState();
  let last = '';
  for (const f of Array.from(files)) {
    if (!/^image\//.test(f.type) && !/\.(svg|png|webp|jpe?g|gif|avif)$/i.test(f.name)) continue;
    try {
      const a = await assets.add(f, f.name);
      last = st.addLogo(a.id);
    } catch {
      st.toast('error', `Impossible de lire « ${f.name} ».`);
    }
  }
  if (last) { st.setPrefs({ tab: 'logos' }); st.toast('ok', 'Logo ajouté. Règle sa place et sa taille ci-dessous.'); }
  return last;
}

export function LogosPanel() {
  const logos = useStore(s => s.scene.logos);
  const addLogo = useStore(s => s.addLogo);
  useSyncExternalStore(assets.subscribe, assets.version);
  const fileRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [open, setOpen] = useState<string | null>(logos[logos.length - 1]?.id || null);
  const lib = assets.list();

  return (
    <>
      <PanelHead title="Logos" sub="PNG, SVG, WebP. Gardés dans le navigateur même après rechargement." />
      <div className="panel-body">
        <div
          className={`dropzone ${over ? 'over' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={async e => { e.preventDefault(); e.stopPropagation(); setOver(false); const id = await addLogoFiles(e.dataTransfer.files); if (id) setOpen(id); }}
        >
          <ImagePlus size={22} /><br /><b>Ajouter un logo</b> ou le glisser ici
          <div className="muted">SVG recommandé : net à toutes les tailles.</div>
          <input ref={fileRef} type="file" accept="image/*,.svg" multiple hidden onChange={async e => { if (e.target.files) { const id = await addLogoFiles(e.target.files); if (id) setOpen(id); } e.target.value = ''; }} />
        </div>

        {lib.length > 0 && (
          <>
            <div className="group-title">Bibliothèque</div>
            <div className="asset-grid">
              {lib.map(a => (
                <div key={a.id} style={{ position: 'relative' }}>
                  <button className="asset" title={`${a.name} — cliquer pour ajouter un calque`} onClick={() => setOpen(addLogo(a.id))}>
                    <img src={a.url} alt={a.name} />
                  </button>
                  <button className="icon-btn" style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, background: 'var(--panel)' }} title="Supprimer de la bibliothèque"
                    onClick={() => { if (confirm(`Supprimer « ${a.name} » de la bibliothèque ?`)) assets.remove(a.id); }}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="group-title">Calques de logo ({logos.length})</div>
        {!logos.length && <div className="muted">Aucun calque. Ajoute un logo ci-dessus.</div>}
        {logos.map((l, i) => <LogoCard key={l.id} l={l} i={i} n={logos.length} open={open === l.id} onToggle={() => setOpen(open === l.id ? null : l.id)} />)}
      </div>
    </>
  );
}

function LogoCard({ l, i, n, open, onToggle }: { l: LogoLayer; i: number; n: number; open: boolean; onToggle: () => void }) {
  const up = useStore(s => s.updateLogo);
  const remove = useStore(s => s.removeLogo);
  const dup = useStore(s => s.duplicateLogo);
  const move = useStore(s => s.moveLogo);
  const setup = useStore(s => s.setup);
  const disabled = useStore(s => s.disabled);
  const u = (p: Partial<LogoLayer>) => up(l.id, p);
  const a = assets.get(l.assetId);
  const lib = assets.list();
  const slices = activeSlices({ setup, scene: useStore.getState().scene, disabled, screens: 'all' });

  return (
    <div className={`card ${l.enabled ? 'on' : ''}`}>
      <div className="card-head">
        <button className="icon-btn" onClick={onToggle} title={open ? 'Replier' : 'Déplier'}>{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
        {a ? <img className="logo-thumb" src={a.url} alt="" /> : <div className="logo-thumb" />}
        <div className="title" onClick={onToggle} style={{ cursor: 'pointer' }}>
          {l.name}<span className="sub">{l.tile ? 'Mosaïque' : ANCHORS.find(x => x.id === l.anchor)?.label} · {l.size} % · {l.target === 'comp' ? 'composition' : l.target === 'pick' ? `${l.sliceIds.length} slice(s)` : 'chaque slice'}{!a && <span className="warn"> · ⚠ image manquante</span>}</span>
        </div>
        <Switch on={l.enabled} onChange={v => u({ enabled: v })} label={l.name} />
      </div>
      {open && (
        <div className="card-body">
          <div className="row" style={{ gap: 4 }}>
            <button className="btn small" disabled={i === 0} onClick={() => move(l.id, -1)} title="Passer dessous"><ArrowUp size={14} /></button>
            <button className="btn small" disabled={i === n - 1} onClick={() => move(l.id, 1)} title="Passer dessus"><ArrowDown size={14} /></button>
            <button className="btn small" onClick={() => dup(l.id)}><Copy size={14} /> Dupliquer</button>
            <span className="spacer" style={{ flex: 1 }} />
            <button className="btn small danger" onClick={() => remove(l.id)}><Trash2 size={14} /> Retirer</button>
          </div>

          {lib.length > 1 && (
            <Field label="Image">
              <div className="asset-grid">
                {lib.map(x => <button key={x.id} className={`asset ${x.id === l.assetId ? 'on' : ''}`} onClick={() => u({ assetId: x.id })} title={x.name}><img src={x.url} alt={x.name} /></button>)}
              </div>
            </Field>
          )}

          <Field label="Où">
            <Seg full value={l.target} onChange={v => u({ target: v })} options={[{ value: 'each', label: 'Chaque slice' }, { value: 'pick', label: 'Au choix' }, { value: 'comp', label: 'Composition' }]} />
          </Field>
          {l.target === 'pick' && (
            <div className="slices" style={{ maxHeight: 180 }}>
              {slices.map(s => (
                <label key={s.id} className="slice-row" style={{ cursor: 'pointer' }}>
                  <span className="n">{s.index + 1}</span><span className="name">{s.name}</span>
                  <Switch on={l.sliceIds.includes(s.id)} onChange={on => u({ sliceIds: on ? [...l.sliceIds, s.id] : l.sliceIds.filter(x => x !== s.id) })} label={s.name} />
                </label>
              ))}
            </div>
          )}

          <Toggle label="Mosaïque (motif répété)" on={l.tile} onChange={v => u({ tile: v })} help="Répète le logo sur toute la surface, comme un filigrane." />
          {l.tile ? (
            <>
              <Slider label="Écart" value={l.tileGap} min={0} max={400} unit="%" onChange={v => u({ tileGap: v })} />
              <Slider label="Angle" value={l.tileAngle} min={-90} max={90} unit="°" onChange={v => u({ tileAngle: v })} />
              <Toggle label="Rangs décalés" on={l.tileStagger} onChange={v => u({ tileStagger: v })} />
            </>
          ) : (
            <>
              <Field label="Position">
                <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
                  <div className="anchors">
                    {ANCHORS.map(x => <button key={x.id} className={x.id === l.anchor ? 'on' : ''} title={x.label} onClick={() => u({ anchor: x.id, offsetX: 0, offsetY: 0 })} />)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <Slider label="Marge" value={l.margin} min={0} max={30} step={0.5} unit="%" onChange={v => u({ margin: v })} />
                  </div>
                </div>
              </Field>
              <div className="grid2">
                <Slider label="Décalage X" value={l.offsetX} min={-50} max={50} step={0.5} unit="%" onChange={v => u({ offsetX: v })} />
                <Slider label="Décalage Y" value={l.offsetY} min={-50} max={50} step={0.5} unit="%" onChange={v => u({ offsetY: v })} />
              </div>
            </>
          )}

          <Slider label="Taille" value={l.size} min={1} max={100} step={0.5} unit="%" onChange={v => u({ size: v })} />
          <Select label="Taille calculée sur" value={l.sizeRef} onChange={v => u({ sizeRef: v as LogoLayer['sizeRef'] })} options={[{ value: 'min', label: 'Petit côté' }, { value: 'width', label: 'Largeur' }, { value: 'height', label: 'Hauteur' }]}
            help="Petit côté : même rendu sur une slice large ou haute. Largeur / hauteur : pour aligner des logos sur des bandeaux." />
          <div className="grid2">
            <Slider label="Opacité" value={l.opacity} min={0} max={100} unit="%" onChange={v => u({ opacity: v })} />
            <Slider label="Rotation" value={l.rotation} min={-180} max={180} unit="°" onChange={v => u({ rotation: v })} />
          </div>
          <Toggle label="Miroir horizontal" on={l.flipX} onChange={v => u({ flipX: v })} />

          <Select label="Couleur" value={l.colorMode} onChange={v => u({ colorMode: v as LogoLayer['colorMode'] })} options={[
            { value: 'original', label: 'Couleurs d’origine' }, { value: 'white', label: 'Tout blanc' }, { value: 'black', label: 'Tout noir' },
            { value: 'slice', label: 'Couleur de la slice' }, { value: 'tint', label: 'Couleur au choix' }, { value: 'invert', label: 'Inversé' },
          ]} help="« Tout blanc » : pratique pour un logo couleur posé sur une mire chargée." />
          {l.colorMode === 'tint' && <ColorInput label="Couleur du logo" value={l.tint} onChange={v => u({ tint: v })} />}

          <Toggle label="Plaque derrière le logo" on={l.plate} onChange={v => u({ plate: v })} help="Un fond arrondi derrière le logo pour qu’il reste lisible sur n’importe quelle mire." />
          {l.plate && (
            <>
              <ColorInput label="Couleur de plaque" value={l.plateColor} onChange={v => u({ plateColor: v })} />
              <div className="grid2">
                <Slider label="Opacité plaque" value={l.plateOpacity} min={0} max={100} unit="%" onChange={v => u({ plateOpacity: v })} />
                <Slider label="Marge plaque" value={l.platePadding} min={0} max={100} unit="%" onChange={v => u({ platePadding: v })} />
              </div>
              <Slider label="Arrondi" value={l.plateRadius} min={0} max={50} unit="%" onChange={v => u({ plateRadius: v })} />
            </>
          )}
          <Toggle label="Ombre portée" on={l.shadow} onChange={v => u({ shadow: v })} />
          {l.shadow && (
            <div className="grid2">
              <Slider label="Flou" value={l.shadowBlur} min={0} max={50} unit="%" onChange={v => u({ shadowBlur: v })} />
              <Slider label="Opacité ombre" value={l.shadowOpacity} min={0} max={100} unit="%" onChange={v => u({ shadowOpacity: v })} />
            </div>
          )}

          <Select label="Animation" value={l.anim} onChange={v => u({ anim: v as LogoAnim })} options={ANIMS} />
          {l.anim !== 'none' && (
            <div className="grid2">
              <Slider label="Cycles par boucle" value={l.animCycles} min={1} max={12} onChange={v => u({ animCycles: Math.round(v) })} />
              <Slider label="Amplitude" value={l.animAmount} min={0} max={100} unit="%" onChange={v => u({ animAmount: v })} />
            </div>
          )}
          <Select label="Fusion" value={l.blend} onChange={v => u({ blend: v as GlobalCompositeOperation })} options={BLENDS} />
        </div>
      )}
    </div>
  );
}
