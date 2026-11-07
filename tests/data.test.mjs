// Loads the data through loadYearIndex with a fake fetch and storage.
// "GitHub" and "the copy in the extension" both read extension/data/ (data-repo/ is a separate repository).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const store = {};
let offline = false;
globalThis.chrome = {
  storage: { local: {
    get: async (k) => (k in store ? { [k]: store[k] } : {}),
    set: async (o) => Object.assign(store, o),
    clear: async () => { for (const k in store) delete store[k]; },
  } },
  runtime: { getURL: (p) => `bundle:${p}` },
};
globalThis.fetch = async (url) => {
  if (url.startsWith('bundle:')) {
    // The copy inside the extension.
    const path = new URL('../extension/' + url.slice(7), import.meta.url);
    if (!existsSync(path)) return { ok: false, status: 404 };
    return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(path, 'utf8')) };
  }
  fetches += 1;
  if (offline) throw new TypeError('NetworkError');
  const path = new URL('../extension/data/' + url.split('/main/')[1], import.meta.url);
  if (!existsSync(path)) return { ok: false, status: 404 };
  return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(path, 'utf8')) };
};

const { loadYearIndex, syncFromGitHub, imageUrl, clearCache } = await import('../extension/lib/data.js');

let fetches = 0;
const s = { owner: 'o', repo: 'r', branch: 'main', lang: 'fa' };

test('builds the 1405 index', async () => {
  const idx = await loadYearIndex(s, 1405);
  assert.equal(idx.get('1405-1-1')[0].id, 'nowruz-1');
  assert.equal(idx.get('1405-10-4')[0].id, 'christmas');   // 2026-12-25
  assert.equal(idx.get('1405-10-11')[0].id, 'new-year');   // 2027-01-01
  assert.equal(idx.get('1405-4-28')[0].id, 'world-cup-final-2026'); // 2026-07-19
  assert.equal(idx.get('1405-9-30')[0].id, 'yalda');
});

test('missing year file is not an error', async () => {
  const idx = await loadYearIndex(s, 1410);
  assert.ok(idx.get('1410-1-13'));
});

test('image urls', () => {
  assert.equal(imageUrl(s, 'images/a.svg'), 'https://raw.githubusercontent.com/o/r/main/images/a.svg');
  assert.equal(imageUrl(s, 'javascript:alert(1)'), null);
});

test('loadYearIndex never uses the network', async () => {
  await clearCache();
  const before = fetches;
  const idx = await loadYearIndex(s, 1405); // first run: the copy inside the extension
  assert.equal(idx.get('1405-1-1')[0].id, 'nowruz-1');
  assert.equal(fetches, before);
});

test('offline: sync fails quietly and the local copy stays', async () => {
  await clearCache();
  offline = true;
  try {
    assert.equal(await syncFromGitHub(s, ['recurring.json']), false);
    const idx = await loadYearIndex(s, 1405);
    assert.equal(idx.get('1405-4-28')[0].id, 'world-cup-final-2026');
  } finally {
    offline = false;
  }
});

test('sync saves GitHub data, then skips files checked recently', async () => {
  await clearCache();
  assert.equal(await syncFromGitHub(s, ['recurring.json']), true); // new data
  const before = fetches;
  assert.equal(await syncFromGitHub(s, ['recurring.json']), false); // checked recently
  assert.equal(fetches, before);
  assert.equal(await syncFromGitHub(s, ['recurring.json'], { force: true }), false); // same data
  assert.equal(fetches, before + 1);
});

test('the saved copy wins over the copy inside the extension', async () => {
  await clearCache();
  await syncFromGitHub(s, ['recurring.json']);
  const key = Object.keys(store).find((k) => k.endsWith(':recurring.json'));
  store[key] = { at: Date.now(), data: { events: [{ id: 'saved', jalali: '02-02', title: 'x' }] } };
  const idx = await loadYearIndex(s, 1405);
  assert.equal(idx.get('1405-2-2')[0].id, 'saved');
});

test('background: a photo from the build shows at once; a newer photo waits for the download', async () => {
  const { localBackground, dayNumber } = await import('../extension/lib/backgrounds.js');
  const list = JSON.parse(readFileSync(new URL('../extension/data/backgrounds.json', import.meta.url), 'utf8')).backgrounds;
  const day = dayNumber(new Date(2026, 10, 7));

  const first = await localBackground(s, list, day);
  assert.equal(first.isToday, true);
  assert.equal(first.src, `bundle:data/${first.entry.image}`);

  // Today's photo was added to GitHub after the build: show the closest earlier photo now.
  const today = list[((day % list.length) + list.length) % list.length];
  const newer = list.map((e) => (e === today ? { ...e, id: 'new', image: 'backgrounds/new.jpg' } : e));
  const fallback = await localBackground(s, newer, day);
  assert.equal(fallback.isToday, false);
  assert.notEqual(fallback.entry.id, 'new');
});
