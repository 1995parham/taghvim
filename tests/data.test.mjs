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
  if (offline) throw new TypeError('NetworkError');
  const path = new URL('../extension/data/' + url.split('/main/')[1], import.meta.url);
  if (!existsSync(path)) return { ok: false, status: 404 };
  return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(path, 'utf8')) };
};

const { loadYearIndex, imageUrl, clearCache } = await import('../extension/lib/data.js');
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

test('offline on the first run uses the copy inside the extension', async () => {
  await clearCache();
  offline = true;
  try {
    const idx = await loadYearIndex(s, 1405);
    assert.equal(idx.get('1405-1-1')[0].id, 'nowruz-1');
    assert.equal(idx.get('1405-4-28')[0].id, 'world-cup-final-2026');
  } finally {
    offline = false;
  }
});

test('offline uses the saved copy first', async () => {
  await clearCache();
  await loadYearIndex(s, 1405); // online: saves a copy
  const key = Object.keys(store).find((k) => k.endsWith(':recurring.json'));
  store[key] = { at: 0, data: { events: [{ id: 'saved', jalali: '02-02', title: 'x' }] } };
  offline = true;
  try {
    const idx = await loadYearIndex(s, 1405);
    assert.equal(idx.get('1405-2-2')[0].id, 'saved');
  } finally {
    offline = false;
  }
});
