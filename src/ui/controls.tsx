import { ReactNode, useEffect, useState } from 'react';
import { ParamDef, ParamValue, Params } from '../core/types';

export function Field({ label, value, help, children }: { label: string; value?: ReactNode; help?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="field">
      <div className="field-row">
        <span className="label">{label}</span>
        <span className="row" style={{ gap: 6 }}>
          {value !== undefined && <span className="value">{value}</span>}
          {help && <button type="button" className={`help-btn ${open ? 'on' : ''}`} onClick={() => setOpen(!open)} title="Aide">?</button>}
        </span>
      </div>
      {help && <div className={`help ${open ? 'open' : ''}`}><p>{help}</p></div>}
      {children}
    </div>
  );
}

export function Slider({ label, value, min, max, step = 1, unit, help, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; help?: string; onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = (s: string) => {
    const n = parseFloat(s.replace(',', '.'));
    if (isFinite(n)) onChange(n); else setDraft(String(value));
  };
  return (
    <Field label={label} help={help} value={
      <span className="row" style={{ gap: 4 }}>
        <input className="num" value={draft} onChange={e => setDraft(e.target.value)} onBlur={e => commit(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value); }} aria-label={label} />
        {unit && <span>{unit}</span>}
      </span>
    }>
      <input type="range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, value))} onChange={e => onChange(Number(e.target.value))} aria-label={label} />
    </Field>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />;
}

export function Toggle({ label, on, help, onChange }: { label: string; on: boolean; help?: string; onChange: (v: boolean) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="field">
      <div className="field-row">
        <span className="label" onClick={() => onChange(!on)} style={{ cursor: 'pointer' }}>{label}</span>
        <span className="row" style={{ gap: 6 }}>
          {help && <button type="button" className={`help-btn ${open ? 'on' : ''}`} onClick={() => setOpen(!open)} title="Aide">?</button>}
          <Switch on={on} onChange={onChange} label={label} />
        </span>
      </div>
      {help && <div className={`help ${open ? 'open' : ''}`}><p>{help}</p></div>}
    </div>
  );
}

export function Select({ label, value, options, help, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; help?: string; onChange: (v: string) => void;
}) {
  if (options.length <= 3 && options.every(o => o.label.length < 18)) {
    return (
      <Field label={label} help={help}>
        <div className="seg full">
          {options.map(o => <button type="button" key={o.value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>)}
        </div>
      </Field>
    );
  }
  return (
    <Field label={label} help={help}>
      <select className="select" value={value} onChange={e => onChange(e.target.value)} aria-label={label}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

export function ColorInput({ label, value, help, onChange }: { label: string; value: string; help?: string; onChange: (v: string) => void }) {
  return (
    <Field label={label} help={help}>
      <span className="color">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} aria-label={label} />
        <code>{value}</code>
      </span>
    </Field>
  );
}

export function TextInput({ label, value, placeholder, help, onChange }: { label: string; value: string; placeholder?: string; help?: string; onChange: (v: string) => void }) {
  return (
    <Field label={label} help={help}>
      <input className="text" value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} aria-label={label} />
    </Field>
  );
}

export function Seg<T extends string>({ value, options, onChange, full }: { value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; full?: boolean }) {
  return (
    <div className={`seg ${full ? 'full' : ''}`}>
      {options.map(o => <button type="button" key={o.value} title={o.title} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>)}
    </div>
  );
}

/** Auto-generated editor for a ParamDef list. Hides the custom colour field
 *  unless a sibling select is set to « custom ». */
export function ParamsEditor({ defs, values, onChange }: { defs: { params: ParamDef[] }; values: Params; onChange: (k: string, v: ParamValue) => void }) {
  const hasCustomSwitch = defs.params.some(d => d.type === 'select' && d.options.some(o => o.value === 'custom'));
  return (
    <>
      {defs.params.map(d => {
        if (d.key === 'custom' && hasCustomSwitch) {
          const sel = defs.params.find(x => x.type === 'select' && x.options.some(o => o.value === 'custom'));
          if (sel && values[sel.key] !== 'custom') return null;
        }
        if (d.key === 'spacing' && values.mode === 'div') return null;
        if (d.key === 'div' && values.mode === 'px' && defs.params.some(x => x.key === 'mode')) return null;
        const v = values[d.key];
        switch (d.type) {
          case 'range': return <Slider key={d.key} label={d.label} value={Number(v)} min={d.min} max={d.max} step={d.step} unit={d.unit} help={d.help} onChange={x => onChange(d.key, x)} />;
          case 'toggle': return <Toggle key={d.key} label={d.label} on={v === true} help={d.help} onChange={x => onChange(d.key, x)} />;
          case 'select': return <Select key={d.key} label={d.label} value={String(v)} options={d.options} help={d.help} onChange={x => onChange(d.key, x)} />;
          case 'color': return <ColorInput key={d.key} label={d.label} value={String(v)} help={d.help} onChange={x => onChange(d.key, x)} />;
          case 'text': return <TextInput key={d.key} label={d.label} value={String(v ?? '')} placeholder={d.placeholder} help={d.help} onChange={x => onChange(d.key, x)} />;
        }
      })}
    </>
  );
}

export function PanelHead({ title, sub }: { title: string; sub?: string }) {
  return <div className="panel-head"><h2>{title}</h2>{sub && <p>{sub}</p>}</div>;
}
