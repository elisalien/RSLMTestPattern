#!/usr/bin/env node
// Local companion server for the Resolume test pattern generator.
//
// - Serves the built app (dist/) with SPA fallback.
// - When run locally and ffmpeg is on PATH, exposes /api/encode/* so the app
//   can stream raw RGBA frames and get DXV / HAP / HAP Q / HAP Alpha /
//   ProRes 4444 / H.264 files that Resolume plays natively.
//
// Usage: node server/serve.mjs [--open] [--port 4777]
// Env:   PORT (cloud hosting, binds 0.0.0.0, encoding off unless RSLM_ENCODE=1)
//        RSLM_OUT  output folder (default: ~/Videos/Mires Resolume)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFile } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const args = process.argv.slice(2);
const argPort = args.includes('--port') ? Number(args[args.indexOf('--port') + 1]) : null;
const cloud = !!process.env.PORT && !argPort;
const PORT = argPort || Number(process.env.PORT) || 4777;
const HOST = cloud ? '0.0.0.0' : '127.0.0.1';
const LOCAL = !cloud;
const ENCODE_ALLOWED = LOCAL || process.env.RSLM_ENCODE === '1';
const OUT_DIR = process.env.RSLM_OUT || path.join(os.homedir(), 'Videos', 'Mires Resolume');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.mov': 'video/quicktime', '.mp4': 'video/mp4',
};

// ─── ffmpeg capabilities ────────────────────────────────────────

let caps = { ffmpeg: false, encoders: [], version: '' };
function probe() {
  return new Promise(res => {
    execFile(FFMPEG, ['-hide_banner', '-encoders'], { windowsHide: true, maxBuffer: 4 << 20 }, (err, stdout) => {
      if (err) { caps = { ffmpeg: false, encoders: [], version: '' }; return res(); }
      const has = n => new RegExp(`^\\s*V\\S*\\s+${n}\\s`, 'm').test(stdout);
      const enc = [];
      if (has('dxv')) enc.push('dxv');
      if (has('hap')) enc.push('hap', 'hapq', 'hapa');
      if (has('prores_ks')) enc.push('prores');
      if (has('libx264')) enc.push('h264');
      execFile(FFMPEG, ['-version'], { windowsHide: true }, (_e, v) => {
        caps = { ffmpeg: true, encoders: enc, version: (v || '').split('\n')[0] };
        res();
      });
    });
  });
}

function codecArgs(codec, w, h) {
  const pad4 = w % 4 || h % 4 ? ['-vf', 'pad=ceil(iw/4)*4:ceil(ih/4)*4'] : [];
  switch (codec) {
    case 'dxv': return { ext: 'mov', args: [...pad4, '-c:v', 'dxv', '-format', 'dxt1'] };
    case 'hap': return { ext: 'mov', args: [...pad4, '-c:v', 'hap', '-format', 'hap', '-compressor', 'snappy', '-chunks', '4'] };
    case 'hapq': return { ext: 'mov', args: [...pad4, '-c:v', 'hap', '-format', 'hap_q', '-compressor', 'snappy', '-chunks', '4'] };
    case 'hapa': return { ext: 'mov', args: [...pad4, '-c:v', 'hap', '-format', 'hap_alpha', '-compressor', 'snappy', '-chunks', '4'] };
    case 'prores': return { ext: 'mov', args: ['-c:v', 'prores_ks', '-profile:v', '4', '-pix_fmt', 'yuva444p10le', '-vendor', 'apl0'] };
    case 'h264': return {
      ext: 'mp4',
      args: [...(w % 2 || h % 2 ? ['-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2'] : []), '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p', '-tune', 'animation', '-movflags', '+faststart'],
    };
    default: return null;
  }
}

// ─── Encode sessions ────────────────────────────────────────────

const sessions = new Map();
let seq = 0;

function safeName(s) {
  return String(s || 'mire').replace(/[\\/:*?"<>|\x00-\x1f]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120) || 'mire';
}

function uniquePath(dir, base, ext) {
  let p = path.join(dir, `${base}.${ext}`);
  for (let i = 2; fs.existsSync(p); i++) p = path.join(dir, `${base} (${i}).${ext}`);
  return p;
}

async function startSession(body) {
  const { name, w, h, fps, codec } = body;
  if (!caps.ffmpeg) throw httpError(503, 'ffmpeg introuvable sur ce PC.');
  if (!caps.encoders.includes(codec)) throw httpError(400, `Codec « ${codec} » non disponible dans ce ffmpeg.`);
  if (!(w > 0 && h > 0 && w <= 16384 && h <= 16384)) throw httpError(400, 'Dimensions invalides.');
  if (![24, 25, 30, 50, 60].includes(fps)) throw httpError(400, 'Cadence invalide.');
  const c = codecArgs(codec, w, h);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = uniquePath(OUT_DIR, `${safeName(name)}_${codec}`, c.ext);
  const ff = spawn(FFMPEG, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-framerate', String(fps), '-i', 'pipe:0',
    ...c.args, '-r', String(fps), file,
  ], { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
  const s = { id: String(++seq), ff, file, frameBytes: w * h * 4, frames: 0, err: '', done: null, pending: null, queue: new Map(), next: 0, chain: Promise.resolve(), touched: Date.now() };
  ff.stderr.on('data', d => { s.err += d.toString(); if (s.err.length > 8000) s.err = s.err.slice(-8000); });
  ff.stdin.on('error', () => { /* reported via exit code */ });
  s.done = new Promise(res => ff.on('close', code => res(code)));
  sessions.set(s.id, s);
  return s;
}

async function pushFrame(s, req, idx) {
  // Receive the whole frame first: many small writes into a Windows pipe
  // (with a drain wait each) were ~50× slower than one big write.
  const buf = Buffer.allocUnsafe(s.frameBytes);
  let n = 0;
  for await (const chunk of req) {
    if (n + chunk.length > s.frameBytes) throw httpError(400, 'Image trop grande.');
    chunk.copy(buf, n);
    n += chunk.length;
  }
  if (n !== s.frameBytes) throw httpError(400, `Image incomplète (${n}/${s.frameBytes} octets).`);
  if (!(idx >= s.next && idx < s.next + 16)) throw httpError(400, `Image ${idx} hors séquence (attendue ${s.next}).`);
  // The browser keeps several uploads in flight: reorder, then write in sequence.
  s.queue.set(idx, buf);
  s.touched = Date.now();
  s.chain = s.chain.then(() => flush(s));
  await s.chain;
  if (s.ff.exitCode !== null && s.ff.exitCode !== 0) throw httpError(500, s.err || 'ffmpeg s’est arrêté.');
}

async function flush(s) {
  while (s.queue.has(s.next)) {
    // Backpressure: wait for the previous write to drain, not this one
    if (s.pending) await s.pending;
    if (s.ff.exitCode !== null) return;
    const buf = s.queue.get(s.next);
    s.queue.delete(s.next);
    s.next++;
    s.frames++;
    if (!s.ff.stdin.write(buf)) s.pending = Promise.race([once(s.ff.stdin, 'drain'), s.done]).then(() => { s.pending = null; });
  }
}

function kill(s) {
  try { s.ff.stdin.destroy(); s.ff.kill('SIGKILL'); } catch { /* ignore */ }
  sessions.delete(s.id);
}

// Abandoned sessions (tab closed mid-export)
setInterval(() => {
  for (const s of sessions.values()) if (Date.now() - s.touched > 120_000) { kill(s); fs.rm(s.file, { force: true }, () => {}); }
}, 30_000).unref();

// ─── HTTP ───────────────────────────────────────────────────────

function httpError(code, msg) { const e = new Error(msg); e.code = code; return e; }

async function readJSON(req) {
  let raw = '';
  for await (const c of req) { raw += c; if (raw.length > 1e5) throw httpError(413, 'Requête trop grosse.'); }
  try { return JSON.parse(raw || '{}'); } catch { throw httpError(400, 'JSON invalide.'); }
}

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function api(req, res, url) {
  const p = url.pathname;
  if (p === '/api/health') {
    return send(res, 200, { ok: true, local: LOCAL, ffmpeg: ENCODE_ALLOWED && caps.ffmpeg, encoders: ENCODE_ALLOWED ? caps.encoders : [], version: caps.version, outDir: LOCAL ? OUT_DIR : '' });
  }
  if (!ENCODE_ALLOWED) throw httpError(403, 'Encodage désactivé sur ce serveur.');
  if (req.method !== 'POST' && !p.startsWith('/api/files/')) throw httpError(405, 'Méthode non autorisée.');

  if (p === '/api/encode/start') {
    const s = await startSession(await readJSON(req));
    return send(res, 200, { id: s.id });
  }
  let m = p.match(/^\/api\/encode\/(\d+)\/(frame|finish|abort)$/);
  if (m) {
    const s = sessions.get(m[1]);
    if (!s) throw httpError(404, 'Session d’encodage inconnue (expirée ?).');
    if (m[2] === 'frame') { await pushFrame(s, req, Number(req.headers['x-frame'] ?? s.next)); res.writeHead(204); return res.end(); }
    if (m[2] === 'abort') { kill(s); fs.rm(s.file, { force: true }, () => {}); res.writeHead(204); return res.end(); }
    await s.chain;
    if (s.queue.size) throw httpError(400, `Images manquantes à partir de ${s.next}.`);
    if (s.pending) await s.pending;
    s.ff.stdin.end();
    const code = await s.done;
    sessions.delete(s.id);
    if (code !== 0) throw httpError(500, s.err.trim() || `ffmpeg a échoué (code ${code}).`);
    const size = fs.statSync(s.file).size;
    return send(res, 200, { name: path.basename(s.file), path: s.file, size, frames: s.frames });
  }
  if (p === '/api/reveal' && LOCAL) {
    const { name } = await readJSON(req);
    const f = path.join(OUT_DIR, path.basename(String(name || '')));
    if (process.platform === 'win32') spawn('explorer.exe', fs.existsSync(f) ? [`/select,${f}`] : [OUT_DIR], { detached: true, windowsHide: false });
    else spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [fs.existsSync(f) ? path.dirname(f) : OUT_DIR], { detached: true });
    res.writeHead(204); return res.end();
  }
  m = p.match(/^\/api\/files\/(.+)$/);
  if (m && LOCAL) {
    const f = path.join(OUT_DIR, path.basename(decodeURIComponent(m[1])));
    if (!fs.existsSync(f)) throw httpError(404, 'Fichier introuvable.');
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(f))}` });
    return fs.createReadStream(f).pipe(res);
  }
  throw httpError(404, 'Route inconnue.');
}

// Text assets are compressed once (brotli, else gzip) and kept in memory
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.svg', '.json']);
const packed = new Map();
function compressed(file, enc) {
  const st = fs.statSync(file);
  const key = `${file}|${enc}|${st.mtimeMs}`;
  let buf = packed.get(key);
  if (!buf) {
    const raw = fs.readFileSync(file);
    buf = enc === 'br'
      ? zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length } })
      : zlib.gzipSync(raw, { level: 9 });
    packed.set(key, buf);
  }
  return buf;
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  let f = path.join(DIST, path.normalize(rel).replace(/^[/\\]+/, ''));
  if (!f.startsWith(DIST)) return send(res, 403, 'Interdit', 'text/plain');
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
  if (!fs.existsSync(f)) return send(res, 500, 'Build manquant : lance « npm run build ».', 'text/plain; charset=utf-8');
  const ext = path.extname(f);
  const headers = {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': f.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
    'vary': 'accept-encoding',
  };
  const accept = String(req.headers['accept-encoding'] || '');
  const want = accept.toLowerCase().split(',').map(e => e.trim().split(';')[0]);
  const enc = !COMPRESSIBLE.has(ext) ? null : want.includes('br') ? 'br' : want.includes('gzip') ? 'gzip' : null;
  if (enc) {
    const body = compressed(f, enc);
    res.writeHead(200, { ...headers, 'content-encoding': enc, 'content-length': body.length });
    return res.end(req.method === 'HEAD' ? undefined : body);
  }
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(f).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else serveStatic(req, res, url);
  } catch (e) {
    if (!res.headersSent) send(res, e.code && e.code >= 400 && e.code < 600 ? e.code : 500, String(e.message || e), 'text/plain; charset=utf-8');
    else res.end();
  }
});
server.requestTimeout = 0;

await probe();
server.listen(PORT, HOST, () => {
  const url = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
  console.log(`Mires Resolume → ${url}`);
  console.log(caps.ffmpeg ? `ffmpeg OK (${caps.encoders.join(', ') || 'aucun codec utile'})` : 'ffmpeg absent : export MP4 navigateur seulement.');
  if (LOCAL) console.log(`Vidéos enregistrées dans : ${OUT_DIR}`);
  if (args.includes('--open')) {
    const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : [process.platform === 'darwin' ? 'open' : 'xdg-open', [url]];
    spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  }
});
