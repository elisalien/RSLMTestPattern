import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './styles.css';
import App from './App';
import { assets } from './state/assets';
import { useStore } from './state/store';
import { Renderer, loopTime } from './render/engine';

// Handy for debugging from the console
(window as unknown as { mires: typeof useStore }).mires = useStore;
// Synchronous render benchmark (works even when the tab is hidden)
(window as unknown as { miresBench: (frames?: number, scale?: number) => string }).miresBench = (frames = 30, scale = 0.5) => {
  const s = useStore.getState();
  const r = new Renderer();
  const c = document.createElement('canvas');
  c.width = Math.round(s.setup.comp.w * scale); c.height = Math.round(s.setup.comp.h * scale);
  const ctx = c.getContext('2d')!;
  const inp = { setup: s.setup, scene: s.scene, disabled: s.disabled, screens: s.prefs.inputScreens };
  let t = performance.now();
  r.renderInput(ctx, inp, loopTime(0, s.scene), scale);
  const first = performance.now() - t;
  t = performance.now();
  for (let f = 1; f <= frames; f++) r.renderInput(ctx, inp, loopTime(f, s.scene), scale);
  // Flush GPU work through a 1-px copy (reading the big canvas itself would
  // make Chromium move it to CPU rendering)
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  probe.drawImage(c, 0, 0, 1, 1, 0, 0, 1, 1);
  probe.getImageData(0, 0, 1, 1);
  return `first ${first.toFixed(1)} ms, then ${((performance.now() - t) / frames).toFixed(2)} ms/frame`;
};

// Canvas text needs the web font loaded before the first render
// (never wait more than 1.2 s: a slow disk or font must not block the app)
Promise.race([
  Promise.allSettled([assets.loadAll(), document.fonts?.load('700 20px "Atkinson Hyperlegible"')]),
  new Promise(r => setTimeout(r, 1200)),
]).finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
