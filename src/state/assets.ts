/**
 * Logo / image assets, stored as Blobs in IndexedDB so they survive reloads
 * (the old app lost every logo on refresh). Decoded images live in a module
 * cache; React state only holds asset ids.
 */

export interface Asset {
  id: string;
  name: string;
  type: string;
  img: HTMLImageElement;
  w: number;
  h: number;
  url: string;
}

const DB = 'rslm-assets';
const STORE = 'assets';
const cache = new Map<string, Asset>();
const listeners = new Set<() => void>();
let version = 0;

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function decode(blob: Blob): Promise<{ img: HTMLImageElement; url: string }> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Image illisible')); };
    img.src = url;
  });
}

/** SVGs without width/height decode at 0×0 or 150×150: give them a size. */
async function normaliseSvg(blob: Blob): Promise<Blob> {
  if (!blob.type.includes('svg')) return blob;
  const txt = await blob.text();
  const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
  const svg = doc.documentElement;
  const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  if (vb.length === 4 && vb[2] > 0) {
    const scale = 2048 / Math.max(vb[2], vb[3]);
    svg.setAttribute('width', String(Math.round(vb[2] * scale)));
    svg.setAttribute('height', String(Math.round(vb[3] * scale)));
  } else if (!svg.getAttribute('width')) {
    svg.setAttribute('width', '1024'); svg.setAttribute('height', '1024');
  }
  return new Blob([new XMLSerializer().serializeToString(doc)], { type: 'image/svg+xml' });
}

function bump() { version++; listeners.forEach(l => l()); }

export const assets = {
  get: (id: string | null | undefined) => (id ? cache.get(id) : undefined),
  list: () => Array.from(cache.values()),
  version: () => version,
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },

  async loadAll() {
    try {
      const rows = await tx<{ id: string; name: string; type: string; blob: Blob }[]>('readonly', s => s.getAll() as IDBRequest<any>);
      for (const r of rows) {
        if (cache.has(r.id)) continue;
        try {
          const { img, url } = await decode(r.blob);
          cache.set(r.id, { id: r.id, name: r.name, type: r.type, img, url, w: img.naturalWidth || 1024, h: img.naturalHeight || 1024 });
        } catch { /* skip broken asset */ }
      }
    } catch (e) {
      console.warn('IndexedDB indisponible, les logos ne seront pas mémorisés', e);
    }
    bump();
  },

  async add(file: Blob, name: string): Promise<Asset> {
    const blob = await normaliseSvg(file);
    const { img, url } = await decode(blob);
    const id = `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const a: Asset = { id, name, type: blob.type, img, url, w: img.naturalWidth || 1024, h: img.naturalHeight || 1024 };
    cache.set(id, a);
    try { await tx('readwrite', s => s.put({ id, name, type: blob.type, blob })); } catch { /* memory only */ }
    bump();
    return a;
  },

  async remove(id: string) {
    const a = cache.get(id);
    if (a) URL.revokeObjectURL(a.url);
    cache.delete(id);
    try { await tx('readwrite', s => s.delete(id)); } catch { /* ignore */ }
    bump();
  },

  /** Data URL for preset export (portable presets carry their logos). */
  async toDataURL(id: string): Promise<string | null> {
    const a = cache.get(id);
    if (!a) return null;
    const blob = await fetch(a.url).then(r => r.blob());
    return new Promise(res => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.readAsDataURL(blob);
    });
  },

  async fromDataURL(data: string, name: string): Promise<Asset> {
    const blob = await fetch(data).then(r => r.blob());
    return assets.add(blob, name);
  },
};
