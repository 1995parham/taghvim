// Daily background photo from the data repository, with offline support.
//
// - backgrounds.json lists the photos. The page shows one photo each day (same photo for all users).
// - Each downloaded photo is kept in the Cache API, so it shows again without a network.
// - Offline and today's photo not saved: show the most recent saved photo.
// - Nothing saved at all: show the photo that is inside the extension (BUILTIN).

import { imageUrl } from './data.js';

const CACHE_NAME = 'taghvim-backgrounds-v1';
const PREFETCH_DAYS = 3; // save the photos of the next days for offline use

export const BUILTIN = Object.freeze({
  id: 'builtin',
  src: 'background.jpg',
  position: 'center 40%',
  place: { fa: 'پونت دل پترولی (اسکله نفت)', en: 'Pont del Petroli' },
  region: { fa: 'بادالونا، کاتالونیا، اسپانیا', en: 'Badalona, Catalonia, Spain' },
  credit: 'Photo: Enric · CC BY-SA 4.0',
  source: 'https://commons.wikimedia.org/wiki/File:01_Platja_de_l%27Estaci%C3%B3_al_capvespre_(Badalona),_al_fons_el_pont_del_Petroli.jpg',
});

/** Days since 1970-01-01 for the local calendar day. */
export function dayNumber(date = new Date()) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

function entryFor(list, day) {
  return list[((day % list.length) + list.length) % list.length];
}

async function openCache() {
  try {
    return 'caches' in globalThis ? await caches.open(CACHE_NAME) : null;
  } catch {
    return null;
  }
}

async function fromCache(cache, url) {
  const hit = cache && (await cache.match(url));
  return hit ? hit.blob() : null;
}

async function download(cache, url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  if (cache) await cache.put(url, res.clone());
  return res.blob();
}

/**
 * Returns { entry, src } for today. src is an object URL or the built-in file.
 * Never throws.
 */
export async function resolveBackground(s, list, day = dayNumber()) {
  if (!Array.isArray(list) || !list.length) return { entry: BUILTIN, src: BUILTIN.src };
  const cache = await openCache();

  const today = entryFor(list, day);
  const url = imageUrl(s, today.image);
  if (url) {
    let blob = await fromCache(cache, url);
    if (!blob) blob = await download(cache, url).catch(() => null);
    if (blob) return { entry: today, src: URL.createObjectURL(blob) };
  }

  // Offline: use the photo of the closest earlier day that is saved.
  for (let back = 1; back <= list.length; back += 1) {
    const e = entryFor(list, day - back);
    const blob = await fromCache(cache, imageUrl(s, e.image));
    if (blob) return { entry: e, src: URL.createObjectURL(blob) };
  }
  return { entry: BUILTIN, src: BUILTIN.src };
}

/** Saves the photos of the next days, and removes saved photos that are not in the list. */
export async function prefetchBackgrounds(s, list, day = dayNumber()) {
  const cache = await openCache();
  if (!cache || !Array.isArray(list) || !list.length) return;
  const wanted = new Set(list.map((e) => imageUrl(s, e.image)).filter(Boolean));

  for (const req of await cache.keys()) {
    if (!wanted.has(req.url)) await cache.delete(req);
  }
  for (let i = 1; i <= Math.min(PREFETCH_DAYS, list.length - 1); i += 1) {
    const url = imageUrl(s, entryFor(list, day + i).image);
    if (url && !(await cache.match(url))) {
      await download(cache, url).catch(() => {});
    }
  }
}
