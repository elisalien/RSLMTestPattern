import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Maximize, Minus, Plus, Square } from 'lucide-react';
import { useStore } from '../state/store';
import { assets } from '../state/assets';
import { Renderer, activeSlices, isAnimated, loopTime } from '../render/engine';
import { patternById } from '../render/patterns';
import { Pt, Slice } from '../core/types';

const pointInQuad = (q: Pt[], p: Pt) => {
  let inside = false;
  for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
    if ((q[i].y > p.y) !== (q[j].y > p.y) && p.x < ((q[j].x - q[i].x) * (p.y - q[i].y)) / (q[j].y - q[i].y) + q[i].x) inside = !inside;
  }
  return inside;
};

export function Stage() {
  const setup = useStore(s => s.setup);
  const scene = useStore(s => s.scene);
  const disabled = useStore(s => s.disabled);
  const view = useStore(s => s.view);
  const screenId = useStore(s => s.screenId);
  const prefs = useStore(s => s.prefs);
  const playing = useStore(s => s.playing);
  const setPlaying = useStore(s => s.setPlaying);
  // Hover readout stays local: a global store update on every mouse move re-rendered the whole UI
  const [hover, setHover] = useState<{ x: number; y: number; slice: string | null; rgb: string } | null>(null);
  const probe = useRef<CanvasRenderingContext2D | null>(null);
  const assetVersion = useSyncExternalStore(assets.subscribe, assets.version);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vpRef = useRef<HTMLDivElement>(null);
  const renderer = useRef(new Renderer());
  const frameRef = useRef(0);
  const [frame, setFrame] = useState(0);
  const [ms, setMs] = useState(0);
  const [zoom, setZoom] = useState<'fit' | number>('fit');
  const [vp, setVp] = useState({ w: 800, h: 600 });

  const screen = setup.screens.find(s => s.id === screenId) || setup.screens[0];
  const out = view === 'output' && screen;
  const W = out ? screen.size.w : setup.comp.w;
  const H = out ? screen.size.h : setup.comp.h;
  const animated = isAnimated(scene);
  const pattern = patternById(scene.patternId);

  useLayoutEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setVp({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = Math.max(0.02, Math.min((vp.w - 48) / W, (vp.h - 48) / H));
  const cssScale = zoom === 'fit' ? fit : zoom;
  const dpr = window.devicePixelRatio || 1;
  const renderScale = prefs.quality === 'auto'
    ? Math.min(1, Math.max(0.1, Math.ceil(cssScale * dpr * 8) / 8))
    : Number(prefs.quality);

  const draw = useCallback((f: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const cw = Math.max(1, Math.round(W * renderScale)), ch = Math.max(1, Math.round(H * renderScale));
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
    const ctx = c.getContext('2d')!;
    const inp = { setup, scene, disabled, screens: prefs.inputScreens };
    const t = loopTime(f, scene);
    try {
      if (out) renderer.current.renderOutput(ctx, inp, screen.id, t, renderScale, prefs.guides);
      else renderer.current.renderInput(ctx, inp, t, renderScale);
    } catch (e) {
      console.error(e);
      ctx.fillStyle = '#2c2218'; ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#ff9a3c'; ctx.font = `${Math.max(14, ch / 20)}px sans-serif`; ctx.textAlign = 'center';
      ctx.fillText('⚠ Erreur de rendu — voir la console', cw / 2, ch / 2);
    }
    return renderer.current.lastMs;
  }, [setup, scene, disabled, out, screen, prefs.inputScreens, prefs.guides, renderScale, W, H]);

  // Static render whenever something changes, coalesced to one per display frame
  // (a slider drag fires far more change events than the screen can show)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const m = draw(frameRef.current);
      if (m !== undefined) setMs(m);
    });
    return () => cancelAnimationFrame(id);
  }, [draw, assetVersion]);

  // Animation loop: only redraw when the loop frame index changes
  useEffect(() => {
    if (!animated || !playing) return;
    let raf = 0;
    const frames = Math.max(1, Math.round(scene.fps * scene.loopSeconds));
    const start = performance.now() - (frameRef.current / scene.fps) * 1000;
    let last = -1, msAcc = 0, n = 0;
    const tick = (now: number) => {
      const f = Math.floor(((now - start) / 1000) * scene.fps) % frames;
      if (f !== last) {
        last = f;
        frameRef.current = f;
        msAcc += draw(f) || 0; n++;
        if (n >= 10) { setMs(msAcc / n); msAcc = 0; n = 0; setFrame(f); }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); setFrame(frameRef.current); };
  }, [animated, playing, draw, scene.fps, scene.loopSeconds]);

  // Keyboard: space = play/pause, arrows = frame step
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); setPlaying(!useStore.getState().playing); }
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !useStore.getState().playing) {
        const frames = Math.max(1, Math.round(scene.fps * scene.loopSeconds));
        frameRef.current = (frameRef.current + (e.key === 'ArrowRight' ? 1 : -1) + frames) % frames;
        setFrame(frameRef.current);
        draw(frameRef.current);
      }
      if (e.key === 'f' || e.key === 'F') setZoom('fit');
      if (e.key === '1') setZoom(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draw, scene.fps, scene.loopSeconds, setPlaying]);

  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const z = cssScale * (e.deltaY < 0 ? 1.15 : 1 / 1.15);
    setZoom(Math.min(16, Math.max(0.02, z)));
  };

  const hoverRaf = useRef(0);
  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
    cancelAnimationFrame(hoverRaf.current);
    hoverRaf.current = requestAnimationFrame(() => {
      let sl: Slice | undefined;
      if (out) sl = screen.slices.find(s => pointInQuad(s.outputContour || s.output, { x, y }));
      else sl = activeSlices({ setup, scene, disabled, screens: prefs.inputScreens }).slice().reverse().find(s => pointInQuad(s.inputContour || s.input, { x, y }));
      // Colour under the cursor via a 1-px copy: calling getImageData on the
      // preview canvas itself makes Chromium drop it to (slow) CPU rendering.
      // Skipped while an animation plays, as the value would change every frame.
      let rgb = '';
      if (!(animated && useStore.getState().playing)) {
        try {
          probe.current ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
          const p = probe.current!;
          p.clearRect(0, 0, 1, 1);
          p.drawImage(c, Math.floor(x * renderScale), Math.floor(y * renderScale), 1, 1, 0, 0, 1, 1);
          const d = p.getImageData(0, 0, 1, 1).data;
          rgb = `${d[0]},${d[1]},${d[2]}`;
        } catch { /* ignore */ }
      }
      setHover({ x: Math.floor(x), y: Math.floor(y), slice: sl ? `${sl.index + 1} · ${sl.name}` : null, rgb });
    });
  };

  const frames = Math.max(1, Math.round(scene.fps * scene.loopSeconds));
  const pct = Math.round(cssScale * 100);

  return (
    <main className="stage">
      <div ref={vpRef} className={`viewport ${zoom === 'fit' ? 'fit' : ''}`} onWheel={onWheel}>
        <div className="viewport-inner">
          <div className="canvas-wrap" style={{ width: W * cssScale, height: H * cssScale }}>
            <canvas ref={canvasRef} className={cssScale * dpr > 2 ? 'pixelated' : ''} onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
          </div>
        </div>
      </div>
      <div className="zoombar">
        <button className="icon-btn" title="Ajuster (F)" onClick={() => setZoom('fit')}><Maximize size={16} /></button>
        <button className="icon-btn" title="Pixels réels 100 % (1)" onClick={() => setZoom(1)}><Square size={15} /></button>
        <button className="icon-btn" title="Dézoomer (Ctrl + molette)" onClick={() => setZoom(Math.max(0.02, cssScale / 1.25))}><Minus size={16} /></button>
        <button className="icon-btn" title="Zoomer (Ctrl + molette)" onClick={() => setZoom(Math.min(16, cssScale * 1.25))}><Plus size={16} /></button>
      </div>
      <div className="statusbar">
        <span><b>{W} × {H}</b> {out ? `sortie ${screen.name}` : 'composition'}</span>
        <span>zoom {pct} %</span>
        <span title="Résolution de rendu de l’aperçu">aperçu {Math.round(renderScale * 100)} % · {ms.toFixed(1)} ms</span>
        {pattern.pixelExact && renderScale < 1 && <span style={{ color: 'var(--orange)' }}>⚠ mire au pixel : passe l’aperçu à 100 % pour la juger</span>}
        {animated && <span>image {String(frame).padStart(3, '0')}/{frames}{!playing && ' (pause, ← →)'}</span>}
        <span className="spacer" />
        {hover && (
          <span>
            x {hover.x} y {hover.y}
            {hover.rgb && <> · <i className="swatch" style={{ background: `rgb(${hover.rgb})` }} />{hover.rgb}</>}
            {hover.slice && <> · <b>{hover.slice}</b></>}
          </span>
        )}
      </div>
    </main>
  );
}
