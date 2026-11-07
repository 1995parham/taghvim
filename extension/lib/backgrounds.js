// Daily background photo from the data repository, with offline support.
//
// - backgrounds.json lists the photos. The page shows one photo each day (same photo for all users).
// - The build puts all photos inside the extension (extension/data/backgrounds/).
// - Photos added to GitHub after the build are downloaded and kept in the Cache API.
// - The page never waits for the network for the first photo (localBackground):
//   today's photo from the extension or the cache, else the closest earlier day's photo,
//   else the built-in photo.
// - If today's photo is new (not in the build, not saved yet), downloadToday() gets it in the
//   background, and the page fades it in.

import { imageUrl, bundledUrl, bundledBackgroundImages } from './data.js';

const CACHE_NAME = 'taghvim-backgrounds-v1';
const PREFETCH_DAYS = 3; // save the photos of the next days for offline use

export const BUILTIN = Object.freeze({
  id: 'builtin',
  src: '../data/backgrounds/badalona-pont-del-petroli-sunset.jpg',
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
 * The photo to show now, from the computer only. Never throws.
 * Returns { entry, src, isToday }. src is an object URL or the built-in file.
 */
export async function localBackground(s, list, day = dayNumber()) {
  if (!Array.isArray(list) || !list.length) return { entry: BUILTIN, src: BUILTIN.src, isToday: false };
  const [cache, bundled] = await Promise.all([openCache(), bundledBackgroundImages()]);
  // back = 0 is today; then the closest earlier day that has a photo on the computer.
  for (let back = 0; back < list.length; back += 1) {
    const e = entryFor(list, day - back);
    if (bundled.has(e.image)) return { entry: e, src: bundledUrl(e.image), isToday: back === 0 };
    const url = imageUrl(s, e.image);
    const blob = url ? await fromCache(cache, url).catch(() => null) : null;
    if (blob) return { entry: e, src: URL.createObjectURL(blob), isToday: back === 0 };
  }
  return { entry: BUILTIN, src: BUILTIN.src, isToday: false };
}

/** Downloads and saves today's photo. Returns { entry, src } or null (offline, error). */
export async function downloadToday(s, list, day = dayNumber()) {
  if (!Array.isArray(list) || !list.length) return null;
  const entry = entryFor(list, day);
  const url = imageUrl(s, entry.image);
  if (!url) return null;
  try {
    const blob = await download(await openCache(), url);
    return { entry, src: URL.createObjectURL(blob) };
  } catch {
    return null;
  }
}

/** Saves the photos of the next days, and removes saved photos that are not in the list. */
export async function prefetchBackgrounds(s, list, day = dayNumber()) {
  const cache = await openCache();
  if (!cache || !Array.isArray(list) || !list.length) return;
  const bundled = await bundledBackgroundImages();
  // Only photos that are not inside the extension are downloaded and kept.
  const wanted = new Set(list.filter((e) => !bundled.has(e.image)).map((e) => imageUrl(s, e.image)).filter(Boolean));

  for (const req of await cache.keys()) {
    if (!wanted.has(req.url)) await cache.delete(req);
  }
  for (let i = 1; i <= Math.min(PREFETCH_DAYS, list.length - 1); i += 1) {
    const url = imageUrl(s, entryFor(list, day + i).image);
    if (url && wanted.has(url) && !(await cache.match(url))) {
      await download(cache, url).catch(() => {});
    }
  }
}
