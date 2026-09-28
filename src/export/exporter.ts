import { Renderer, RenderInput, activeSlices, loopTime } from '../render/engine';
import { SceneState, Setup, Slice } from '../core/types';
import { makeZip } from './zip';

// ─── Export items ───────────────────────────────────────────────

export interface ExportItem {
  name: string;
  w: number;
  h: number;
  /** Draw frame `f` into ctx (canvas sized w × h). */
  draw(ctx: CanvasRenderingContext2D, frame: number): void;
}

export interface ExportContext {
  setup: Setup;
  scene: SceneState;
  disabled: string[];
  view: 'input' | 'output';
  screenId: string;
  inputScreens: 'all' | string[];
}

const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80) || 'mire';

export function exportBaseName(c: ExportContext) {
  return clean(`${c.scene.showTitle || c.setup.name}`);
}

export function buildItems(c: ExportContext, what: 'view' | 'comp' | 'screens' | 'slices', scale: number): ExportItem[] {
  const inp: RenderInput = { setup: c.setup, scene: c.scene, disabled: c.disabled, screens: c.inputScreens };
  const all: RenderInput = { ...inp, screens: 'all' };
  const base = exportBaseName(c);
  const pat = c.scene.patternId;
  const R = (w: number, h: number) => `${Math.round(w)}x${Math.round(h)}`;

  const compItem = (i: RenderInput): ExportItem => {
    const r = new Renderer();
    const w = Math.round(c.setup.comp.w * scale), h = Math.round(c.setup.comp.h * scale);
    return { name: `${base}_${pat}_composition_${R(w, h)}`, w, h, draw: (ctx, f) => r.renderInput(ctx, i, loopTime(f, c.scene), scale) };
  };
  const screenItem = (id: string): ExportItem => {
    const sc = c.setup.screens.find(s => s.id === id)!;
    const r = new Renderer();
    const w = Math.round(sc.size.w * scale), h = Math.round(sc.size.h * scale);
    return { name: `${base}_${pat}_${clean(sc.name)}_${R(w, h)}`, w, h, draw: (ctx, f) => r.renderOutput(ctx, all, id, loopTime(f, c.scene), scale, false) };
  };

  if (what === 'view') return [c.view === 'output' ? screenItem(c.screenId) : compItem(inp)];
  if (what === 'comp') return [compItem(inp)];
  if (what === 'screens') return c.setup.screens.filter(s => s.enabled && s.slices.length).map(s => screenItem(s.id));

  // One file per slice, cropped (and un-rotated) from the composition
  const r = new Renderer();
  const buf = document.createElement('canvas');
  let bufFrame = -1;
  const compW = Math.round(c.setup.comp.w * scale), compH = Math.round(c.setup.comp.h * scale);
  const renderComp = (f: number) => {
    if (bufFrame === f) return;
    if (buf.width !== compW || buf.height !== compH) { buf.width = compW; buf.height = compH; }
    r.renderInput(buf.getContext('2d')!, inp, loopTime(f, c.scene), scale);
    bufFrame = f;
  };
  return activeSlices(inp).map((sl: Slice) => {
    const w = Math.round(sl.frame.w * scale), h = Math.round(sl.frame.h * scale);
    return {
      name: `${base}_${pat}_${String(sl.index + 1).padStart(2, '0')}_${clean(sl.name)}_${R(w, h)}`,
      w, h,
      draw(ctx, f) {
        renderComp(f);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.scale(scale, scale);
        if (sl.frame.angle) ctx.rotate(-sl.frame.angle);
        ctx.translate(-sl.frame.x, -sl.frame.y);
        ctx.scale(1 / scale, 1 / scale);
        ctx.drawImage(buf, 0, 0);
        ctx.restore();
      },
    };
  });
}

// ─── Stills ─────────────────────────────────────────────────────

function canvasFor(it: ExportItem, alpha = true) {
  const c = document.createElement('canvas');
  c.width = it.w; c.height = it.h;
  return { c, ctx: c.getContext('2d', { alpha, willReadFrequently: !alpha })! };
}

const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('Canvas trop grand pour l’export PNG'))), 'image/png'));

export async function exportPNG(items: ExportItem[], frame: number, zipName: string) {
  if (items.length === 1) {
    const { c, ctx } = canvasFor(items[0]);
    items[0].draw(ctx, frame);
    download(await toBlob(c), `${items[0].name}.png`);
    return;
  }
  const files: { name: string; blob: Blob }[] = [];
  for (const it of items) {
    const { c, ctx } = canvasFor(it);
    it.draw(ctx, frame);
    files.push({ name: `${it.name}.png`, blob: await toBlob(c) });
  }
  download(await makeZip(files), `${zipName}.zip`);
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ─── Video ──────────────────────────────────────────────────────

export interface CodecInfo {
  id: string;
  name: string;
  ext: string;
  where: 'browser' | 'server';
  alpha: boolean;
  desc: string;
}

export const CODECS: CodecInfo[] = [
  { id: 'dxv', name: 'DXV 3', ext: 'mov', where: 'server', alpha: false, desc: 'Codec natif Resolume : le plus léger à lire en live.' },
  { id: 'hap', name: 'HAP', ext: 'mov', where: 'server', alpha: false, desc: 'Lecture GPU, compatible Resolume, TouchDesigner, MadMapper.' },
  { id: 'hapq', name: 'HAP Q', ext: 'mov', where: 'server', alpha: false, desc: 'HAP haute qualité : dégradés plus propres.' },
  { id: 'hapa', name: 'HAP Alpha', ext: 'mov', where: 'server', alpha: true, desc: 'HAP avec transparence (fond transparent).' },
  { id: 'prores', name: 'ProRes 4444', ext: 'mov', where: 'server', alpha: true, desc: 'Master de très haute qualité, avec alpha.' },
  { id: 'h264', name: 'H.264 (ffmpeg)', ext: 'mp4', where: 'server', alpha: false, desc: 'MP4 haute qualité encodé par ffmpeg.' },
  { id: 'mp4', name: 'MP4 navigateur', ext: 'mp4', where: 'browser', alpha: false, desc: 'Encodé dans le navigateur, sans serveur. À convertir en DXV pour le live.' },
];

export interface Progress { item: number; items: number; frame: number; frames: number; label: string }

export interface ServerHealth { ok: boolean; ffmpeg: boolean; encoders: string[]; outDir: string; version?: string }

export async function serverHealth(): Promise<ServerHealth | null> {
  try {
    const r = await fetch('/api/health', { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export async function exportVideo(
  items: ExportItem[],
  opts: { codec: string; fps: number; frames: number; loops: number; alpha: boolean },
  onProgress: (p: Progress) => void,
  signal: AbortSignal,
): Promise<{ files: { name: string; path?: string; size: number }[] }> {
  const codec = CODECS.find(c => c.id === opts.codec) || CODECS[CODECS.length - 1];
  const out: { name: string; path?: string; size: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const total = opts.frames * Math.max(1, opts.loops);
    const report = (frame: number, label: string) => onProgress({ item: i, items: items.length, frame, frames: total, label });
    if (codec.where === 'server') out.push(await encodeOnServer(it, codec, opts.fps, opts.frames, total, report, signal));
    else out.push(await encodeInBrowser(it, opts.fps, opts.frames, total, report, signal));
  }
  return { files: out };
}

// ── Server (ffmpeg) path ──

async function encodeOnServer(
  it: ExportItem, codec: CodecInfo, fps: number, loopFrames: number, total: number,
  report: (f: number, l: string) => void, signal: AbortSignal,
) {
  const start = await fetch('/api/encode/start', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: `${it.name}_${fps}fps`, w: it.w, h: it.h, fps, codec: codec.id }),
  });
  if (!start.ok) throw new Error(`Serveur d’encodage : ${await start.text()}`);
  const { id } = await start.json();
  const { ctx } = canvasFor(it, true);
  // A few uploads stay in flight while the next frame renders; the server
  // puts them back in order (x-frame). Blob bodies upload ~5× faster than
  // typed arrays in Chromium.
  const inflight = new Set<Promise<void>>();
  let done = 0;
  const send = (f: number, body: Blob) => {
    const p = fetch(`/api/encode/${id}/frame`, { method: 'POST', body, headers: { 'content-type': 'application/octet-stream', 'x-frame': String(f) }, signal })
      .then(async r => {
        if (!r.ok) throw new Error(`Encodage interrompu : ${await r.text()}`);
        done++;
        report(done, `${codec.name} · image ${done}/${total}`);
      })
      .finally(() => inflight.delete(p));
    inflight.add(p);
    return p;
  };
  try {
    for (let f = 0; f < total; f++) {
      if (signal.aborted) throw new DOMException('Export annulé', 'AbortError');
      it.draw(ctx, f % loopFrames);
      const body = new Blob([ctx.getImageData(0, 0, it.w, it.h).data]);
      send(f, body).catch(() => {});
      while (inflight.size >= 3) await Promise.race(inflight);
    }
    await Promise.all([...inflight]);
    if (done !== total) throw new Error('Des images n’ont pas été envoyées au serveur.');
    report(total, `${codec.name} · finalisation…`);
    const fin = await fetch(`/api/encode/${id}/finish`, { method: 'POST' });
    if (!fin.ok) throw new Error(`ffmpeg : ${await fin.text()}`);
    return await fin.json();
  } catch (e) {
    fetch(`/api/encode/${id}/abort`, { method: 'POST' }).catch(() => {});
    throw e;
  }
}

// ── Browser (WebCodecs) path ──

const BITRATE_PER_PIXEL = 8; // bits per pixel per second at 30 fps → ~16 Mb/s in 1080p

async function encodeInBrowser(
  it: ExportItem, fps: number, loopFrames: number, total: number,
  report: (f: number, l: string) => void, signal: AbortSignal,
) {
  if (!('VideoEncoder' in window)) throw new Error('Ce navigateur ne sait pas encoder de vidéo (WebCodecs). Utilise Chrome ou Edge, ou lance la version locale pour DXV / HAP.');
  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
  // H.264 4:2:0 needs even dimensions: pad by one black pixel if needed
  const W = it.w + (it.w % 2), H = it.h + (it.h % 2);
  const bitrate = Math.min(80_000_000, Math.max(6_000_000, W * H * BITRATE_PER_PIXEL * (fps / 30)));

  const candidates: { mux: 'avc' | 'vp9' | 'av1'; codec: string }[] = [
    { mux: 'avc', codec: 'avc1.640033' }, // High 5.1
    { mux: 'avc', codec: 'avc1.64003c' }, // High 6.0 (beyond 4K)
    { mux: 'avc', codec: 'avc1.4d0034' },
    { mux: 'vp9', codec: 'vp09.00.51.08' },
    { mux: 'av1', codec: 'av01.0.12M.08' },
  ];
  let pick: (typeof candidates)[number] | null = null;
  let hw: HardwareAcceleration = 'no-preference';
  for (const c of candidates) {
    for (const h of ['prefer-hardware', 'prefer-software'] as HardwareAcceleration[]) {
      try {
        const s = await VideoEncoder.isConfigSupported({ codec: c.codec, width: W, height: H, bitrate, framerate: fps, hardwareAcceleration: h });
        if (s.supported) { pick = c; hw = h; break; }
      } catch { /* next */ }
    }
    if (pick) break;
  }
  if (!pick) throw new Error(`Aucun encodeur vidéo du navigateur n’accepte ${W}×${H}. Réduis l’échelle d’export ou utilise la version locale (ffmpeg).`);

  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: pick.mux, width: W, height: H, frameRate: fps }, fastStart: 'in-memory' });
  let encErr: Error | null = null;
  const enc = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: e => { encErr = e instanceof Error ? e : new Error(String(e)); },
  });
  enc.configure({
    codec: pick.codec, width: W, height: H, bitrate, framerate: fps, hardwareAcceleration: hw,
    latencyMode: 'quality', ...(pick.mux === 'avc' ? { avc: { format: 'avc' } } : {}),
  } as VideoEncoderConfig);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false })!;
  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = it.w; frameCanvas.height = it.h;
  const fctx = frameCanvas.getContext('2d')!;
  const dur = 1_000_000 / fps;

  for (let f = 0; f < total; f++) {
    if (signal.aborted) { enc.close(); throw new DOMException('Export annulé', 'AbortError'); }
    if (encErr) throw encErr;
    it.draw(fctx, f % loopFrames);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(frameCanvas, 0, 0);
    const vf = new VideoFrame(canvas, { timestamp: Math.round(f * dur), duration: Math.round(dur) });
    enc.encode(vf, { keyFrame: f % fps === 0 });
    vf.close();
    while (enc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 4));
    if (f % 4 === 0) { report(f + 1, `MP4 · image ${f + 1}/${total}`); await new Promise(r => setTimeout(r, 0)); }
  }
  report(total, 'MP4 · finalisation…');
  await enc.flush();
  if (encErr) throw encErr;
  enc.close();
  muxer.finalize();
  const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
  const name = `${it.name}_${fps}fps${W !== it.w || H !== it.h ? '_pad' : ''}.mp4`;
  download(blob, name);
  return { name, size: blob.size };
}
