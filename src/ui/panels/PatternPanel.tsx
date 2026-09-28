import { useStore } from '../../state/store';
import { PATTERNS, PATTERN_CATEGORIES, patternById, withDefaults } from '../../render/patterns';
import { PanelHead, ParamsEditor, Seg } from '../controls';
import { patternThumb } from '../thumbs';

export function PatternPanel() {
  const scene = useStore(s => s.scene);
  const setPattern = useStore(s => s.setPattern);
  const setScope = useStore(s => s.setPatternScope);
  const setParam = useStore(s => s.setPatternParam);
  const def = patternById(scene.patternId);
  const values = withDefaults(def, scene.patternParams[def.id]);

  return (
    <>
      <PanelHead title="Mire" sub="Le motif de fond. Les repères et logos s’ajoutent par-dessus." />
      <div className="panel-body">
        <div className="card on">
          <div className="card-head"><div className="title">{def.name}<span className="sub">{def.desc}</span></div></div>
          <div className="card-body">
            <Seg full value={scene.patternScope} onChange={setScope} options={[
              { value: 'slice', label: 'Dans chaque slice', title: 'La mire est recalculée pour chaque slice' },
              { value: 'comp', label: 'Sur toute la composition', title: 'Une seule mire continue sur toute la composition' },
            ]} />
            {def.params.length > 0 && <ParamsEditor defs={def} values={values} onChange={setParam} />}
            {def.pixelExact && <div className="note">Mire au pixel près : exporte à l’échelle 100 % et regarde l’aperçu en « Pixels réels ».</div>}
          </div>
        </div>

        {PATTERN_CATEGORIES.map(cat => (
          <div key={cat}>
            <div className="group-title" style={{ marginBottom: 6 }}>{cat}</div>
            <div className="gallery">
              {PATTERNS.filter(p => p.category === cat).map(p => (
                <button key={p.id} className={`tile ${p.id === def.id ? 'on' : ''}`} onClick={() => setPattern(p.id)} title={p.desc}>
                  <img src={patternThumb(p.id, scene.themeId, scene.patternParams[p.id])} alt="" loading="lazy" />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
