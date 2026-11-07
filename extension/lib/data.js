// Loads holiday data from a public GitHub repository.
//
// Repository layout:
//   recurring.json        events that repeat every year (fixed Jalali or Gregorian day)
//   years/<jalali>.json   events for one Jalali year (lunar holidays, one-off events)
//   images/...            pictures referenced by events

import { api } from './settings.js';
import { toJalali, toGregorian, isValidJalali, isValidGregorian, jKey } from './jalali.js';

const TTL_MS = 6 * 60 * 60 * 1000;

export function rawUrl(s, path) {
  const clean = String(path).replace(/^\/+/, '');
  return `https://raw.githubusercontent.com/${s.owner}/${s.repo}/${s.branch}/${clean}`;
}

export function repoUrl(s) {
  return `https://github.com/${s.owner}/${s.repo}`;
}

export function imageUrl(s, image) {
  if (!image) return null;
  if (/^https:\/\//i.test(image)) return image;
  if (/^[a-z]+:/i.test(image)) return null; // only https or repo-relative paths
  return rawUrl(s, image);
}

async function fetchJson(url, optional) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (res.status === 404 && optional) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/** Repo-relative path -> URL of the copy inside the extension (extension/data/), or null. */
export function bundledUrl(path) {
  if (!path || /^[a-z]+:/i.test(path) || !api?.runtime?.getURL) return null;
  return api.runtime.getURL(`data/${String(path).replace(/^\/+/, '')}`);
}

async function bundledJson(path) {
  const url = bundledUrl(path);
  if (!url) return null;
  try {
    const res = await fetch(url);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * Loads one JSON file of the data repository. The order is:
 *   1. the saved copy, if it is younger than TTL_MS
 *   2. GitHub
 *   3. the saved copy of any age (offline)
 *   4. the copy inside the extension (offline on the first run, or the file is not on GitHub)
 */
async function cached(s, path, force) {
  // v2: older versions saved "null" for files that were not on GitHub.
  const key = `v2:${prefixOf(s)}:${path}`;
  const hit = (await api.storage.local.get(key))[key];
  if (!force && hit && Date.now() - hit.at < TTL_MS && hit.data != null) return hit.data;
  let data;
  try {
    data = await fetchJson(rawUrl(s, path), true);
  } catch (err) {
    if (hit?.data != null) return hit.data;
    const local = await bundledJson(path);
    if (local != null) return local;
    throw err;
  }
  if (data == null) data = await bundledJson(path);
  await api.storage.local.set({ [key]: { at: Date.now(), data } });
  return data;
}

/** Removes the saved JSON data. Saved background photos stay, so they still work offline. */
export async function clearCache() {
  await api.storage.local.clear();
}

function parseParts(str) {
  return String(str).split('-').map((p) => Number.parseInt(p, 10));
}

function prefixOf(s) {
  return `${s.owner}/${s.repo}@${s.branch}`;
}

/** hijri.json: official Hijri month starts. Returns null if the file does not exist. */
export async function loadHijri(s, { force = false } = {}) {
  return cached(s, 'hijri.json', force);
}

/** backgrounds.json: the list of daily background photos. Returns [] if the file does not exist. */
export async function loadBackgroundList(s, { force = false } = {}) {
  const data = await cached(s, 'backgrounds.json', force);
  return Array.isArray(data?.backgrounds) ? data.backgrounds : [];
}

/**
 * Builds a Map of "jy-jm-jd" -> [event] for one Jalali year.
 * Throws only if GitHub, the saved copy, and the copy in the extension all fail.
 */
export async function loadYearIndex(s, jy, { force = false } = {}) {
  const [recurring, year] = await Promise.all([
    cached(s, 'recurring.json', force),
    cached(s, `years/${jy}.json`, force),
  ]);

  const index = new Map();
  const add = (y, m, d, ev) => {
    if (y !== jy || !isValidJalali(y, m, d)) return;
    const k = jKey(y, m, d);
    if (!index.has(k)) index.set(k, []);
    index.get(k).push(ev);
  };

  for (const ev of recurring?.events ?? []) {
    if (ev.jalali) {
      const [m, d] = parseParts(ev.jalali);
      add(jy, m, d, ev);
    } else if (ev.gregorian) {
      const [m, d] = parseParts(ev.gregorian);
      // A Jalali year covers parts of two Gregorian years.
      for (const gy of [jy + 621, jy + 622]) {
        if (!isValidGregorian(gy, m, d)) continue;
        const j = toJalali(gy, m, d);
        add(j.jy, j.jm, j.jd, ev);
      }
    }
  }

  for (const ev of year?.events ?? []) {
    if (ev.jalali) {
      const [y, m, d] = parseParts(ev.jalali);
      add(y, m, d, ev);
    } else if (ev.gregorian) {
      const [gy, gm, gd] = parseParts(ev.gregorian);
      if (!isValidGregorian(gy, gm, gd)) continue;
      const j = toJalali(gy, gm, gd);
      add(j.jy, j.jm, j.jd, ev);
    }
  }

  for (const list of index.values()) list.sort((a, b) => Number(!!b.holiday) - Number(!!a.holiday));
  return index;
}

/** Picks the text for the language from a string or a { fa, en } object. */
export function pick(value, lang) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] ?? value.fa ?? value.en ?? '';
}

export { toGregorian };
