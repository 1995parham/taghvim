import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toHijri } from '../extension/lib/hijri.js';
import { dayNumber } from '../extension/lib/backgrounds.js';

test('Umm al-Qura base date', () => {
  assert.deepEqual(toHijri(2026, 11, 7), { hy: 1448, hm: 5, hd: 27 });
});

test('adjust moves the date', () => {
  assert.deepEqual(toHijri(2026, 11, 7, { adjust: -1 }), { hy: 1448, hm: 5, hd: 26 });
});

test('official month start wins', () => {
  const data = { months: [{ month: '1448-06', start: '2026-11-11' }, { month: '1448-07', start: '2026-12-10' }] };
  assert.deepEqual(toHijri(2026, 11, 11, data), { hy: 1448, hm: 6, hd: 1 });
  assert.deepEqual(toHijri(2026, 12, 9, data), { hy: 1448, hm: 6, hd: 29 });
  assert.deepEqual(toHijri(2026, 12, 10, data), { hy: 1448, hm: 7, hd: 1 });
});

test('day number is stable for one local day', () => {
  assert.equal(dayNumber(new Date(2026, 10, 7, 0, 1)), dayNumber(new Date(2026, 10, 7, 23, 59)));
  assert.equal(dayNumber(new Date(2026, 10, 8)) - dayNumber(new Date(2026, 10, 7)), 1);
});
