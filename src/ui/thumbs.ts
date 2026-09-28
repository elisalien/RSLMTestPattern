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
