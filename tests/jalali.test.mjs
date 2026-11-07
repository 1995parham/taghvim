// Run: node --test 'tests/*.test.mjs'
// Compares the conversion with the ICU Persian calendar for every day from 1950 to 2100.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toJalali, toGregorian, jalaliMonthLength, weekdaySat } from '../extension/lib/jalali.js';

const fmt = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
  year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC',
});

function icu(date) {
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return { jy: Number.parseInt(parts.year, 10), jm: Number(parts.month), jd: Number(parts.day) };
}

test('matches ICU persian calendar and round-trips', () => {
  const start = Date.UTC(1950, 0, 1);
  const end = Date.UTC(2100, 0, 1);
  for (let ms = start; ms < end; ms += 86400000) {
    const d = new Date(ms);
    const g = { gy: d.getUTCFullYear(), gm: d.getUTCMonth() + 1, gd: d.getUTCDate() };
    const j = toJalali(g.gy, g.gm, g.gd);
    assert.deepEqual(j, icu(d), `toJalali ${JSON.stringify(g)}`);
    assert.deepEqual(toGregorian(j.jy, j.jm, j.jd), g);
  }
});

test('known dates', () => {
  assert.deepEqual(toJalali(2026, 11, 7), { jy: 1405, jm: 8, jd: 16 });
  assert.deepEqual(toGregorian(1405, 1, 1), { gy: 2026, gm: 3, gd: 21 });
  assert.equal(weekdaySat(2026, 11, 7), 0); // Saturday
  assert.equal(jalaliMonthLength(1403, 12), 30); // 1403 is a leap year
  assert.equal(jalaliMonthLength(1404, 12), 29);
});
