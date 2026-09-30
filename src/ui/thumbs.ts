import { useEffect, useState } from 'react';
import { DrawTarget, Params } from '../core/types';
import { DEMO_SETUP } from '../core/xml';
import { PATTERNS, withDefaults } from '../render/patterns';
import { sliceHsl, themeById } from '../render/themes';

const cache = new Map<string, string>();
const demo = DEMO_SETUP();

/** Small preview image of a pattern (cached per theme + params). */
export function patternThumb(id: string, themeId: string, params?: Params): string {
  const def = PATTERNS.find(p => p.id === id)!;
  const p = withDefaults(def, params);
  const key = `${id}|${themeId}|${JSON.stringify(p)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 640, H = 360, s = 0.4;
  const c = document.createElement('canvas');
  c.width = W * s; c.height = H * s;
  const ctx = c.getContext('2d')!;
  ctx.scale(s, s);
  const theme = themeById(themeId);
  const t: DrawTarget = {
    w: W, h: H, index: 2, slice: null, color: sliceHsl(theme, 2), colorDark: sliceHsl(theme, 2, -theme.light * 0.72),
    label: 'Slice', theme, setup: demo, px: s, origin: { x: 0, y: 0 }, angle: 0,
  };
  try {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    def.draw(ctx, t, p);
    theme.post?.(ctx, { x: 0, y: 0, w: W, h: H });
  } catch { /* keep partial */ }
  const url = c.toDataURL('image/png');
  if (cache.size > 200) cache.clear();
  cache.set(key, url);
  return url;
}

// ─── Non-blocking thumbnails ────────────────────────────────────
// Rendering 20 thumbnails synchronously froze the UI when opening the Mire
// tab; they are now produced one by one in idle time.


type Job = { key: string; run: () => string; done: Set<(u: string) => void> };
const queue: Job[] = [];
let pumping = false;
const idle = (cb: () => void) =>
  ('requestIdleCallback' in window ? (window as Window & { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback(cb, { timeout: 120 }) : setTimeout(cb, 16));

function pump() {
  if (pumping) return;
  pumping = true;
  idle(() => {
    // Skip jobs nobody waits for any more (e.g. stale params during a slider drag)
    let job = queue.shift();
    while (job && !job.done.size) job = queue.shift();
    if (job) {
      const url = job.run();
      job.done.forEach(fn => fn(url));
    }
    pumping = false;
    if (queue.length) pump();
  });
}

const thumbKey = (id: string, themeId: string, params?: Params) => `${id}|${themeId}|${JSON.stringify(params || {})}`;
const ready = new Map<string, string>();

export function useThumb(id: string, themeId: string, params?: Params): string | null {
  const key = thumbKey(id, themeId, params);
  const [url, setUrl] = useState<string | null>(() => ready.get(key) || null);
  useEffect(() => {
    const hit = ready.get(key);
    if (hit) { setUrl(hit); return; }
    let alive = true;
    const cb = (u: string) => { ready.set(key, u); if (alive) setUrl(u); };
    let job = queue.find(j => j.key === key);
    if (!job) { job = { key, run: () => patternThumb(id, themeId, params), done: new Set() }; queue.push(job); }
    job.done.add(cb);
    pump();
    return () => { alive = false; job!.done.delete(cb); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return url;
}
