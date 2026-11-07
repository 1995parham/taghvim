// Loads holiday data from a public GitHub repository.
//
// Repository layout:
//   recurring.json        events that repeat every year (fixed Jalali or Gregorian day)
//   years/<jalali>.json   events for one Jalali year (lunar holidays, one-off events)
//   images/...            pictures referenced by events

import { api } from './settings.js';
import { toJalali, toGregorian, isValidJalali, isValidGregorian, jKey } from './jalali.js';

// The page never waits for GitHub. It renders from the local copy, then checks GitHub
// (at most once in CHECK_INTERVAL_MS), and renders again if the data changed.
const CHECK_INTERVAL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

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
  // A network that is connected but does not work can hang; stop after FETCH_TIMEOUT_MS.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, { cache: 'no-cache', signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 404 && optional) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/** Repo-relative path -> URL of the copy inside the extension (extension/data/), or null. */
export function bundledUrl(path) {
  if (!path || /^[a-z]+:/i.test(path) || !api?.runtime?.getURL) return null;
  return api.runtime.getURL(`data/${String(path).replace(/^\/+/, '')}`);
}

/** Image paths of the background photos inside the extension. */
export async function bundledBackgroundImages() {
  const data = await bundledJson('backgrounds.json');
  return new Set((data?.backgrounds ?? []).map((b) => b.image));
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

const keyOf = (s, path) => `v2:${prefixOf(s)}:${path}`;

/**
 * Reads one JSON file of the data repository from the computer only (fast, works offline):
 * the copy saved from GitHub, else the copy inside the extension, else null.
 */
async function readLocal(s, path) {
  const key = keyOf(s, path);
  const hit = (await api.storage.local.get(key))[key];
  if (hit?.data != null) return hit.data;
  return bundledJson(path);
}

/**
 * Downloads files from GitHub and saves them. Files checked less than CHECK_INTERVAL_MS ago
 * are skipped, unless force is true. Errors (offline, timeout) keep the saved copy.
 * Returns true if a saved file changed, so the page can render again.
 */
export async function syncFromGitHub(s, paths, { force = false } = {}) {
  const results = await Promise.all(paths.map(async (path) => {
    const key = keyOf(s, path);
    const hit = (await api.storage.local.get(key))[key];
    if (!force && hit && Date.now() - hit.at < CHECK_INTERVAL_MS) return false;
    let data;
    try {
      data = await fetchJson(rawUrl(s, path), true);
    } catch {
      return false;
    }
    await api.storage.local.set({ [key]: { at: Date.now(), data } });
    return JSON.stringify(data) !== JSON.stringify(hit?.data ?? null);
  }));
  return results.some(Boolean);
}

/** The files that the new tab page uses for the Jalali years in the list. */
export function filesFor(years) {
  return ['recurring.json', 'hijri.json', 'backgrounds.json', ...years.map((y) => `years/${y}.json`)];
}

/** Removes the saved JSON data (the copy inside the extension stays). Saved photos also stay. */
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
export async function loadHijri(s) {
  return readLocal(s, 'hijri.json');
}

/** backgrounds.json: the list of daily background photos. Returns [] if the file does not exist. */
export async function loadBackgroundList(s) {
  const data = await readLocal(s, 'backgrounds.json');
  return Array.isArray(data?.backgrounds) ? data.backgrounds : [];
}

/**
 * Builds a Map of "jy-jm-jd" -> [event] for one Jalali year.
 * It reads only the local copy; call syncFromGitHub() to update it.
 */
export async function loadYearIndex(s, jy) {
  const [recurring, year] = await Promise.all([
    readLocal(s, 'recurring.json'),
    readLocal(s, `years/${jy}.json`),
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
