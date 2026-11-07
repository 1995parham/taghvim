// Hijri (lunar) date. Works offline.
//
// The base is the Umm al-Qura calendar from the browser (ICU). Iran sets the official
// month starts by moon sighting, so they can differ by one day. hijri.json in the data
// repository corrects this:
//   { "adjust": 0, "months": [{ "month": "1448-06", "start": "2026-11-22" }] }
// - "months": official month starts (Gregorian date of day 1). List them in sequence.
// - "adjust": days to add to the Umm al-Qura date when no listed month matches.

const DAY_MS = 86400000;

const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
  year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC',
});

function fromIntl(ms) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { hy: Number.parseInt(p.year, 10), hm: Number(p.month), hd: Number(p.day) };
}

export function toHijri(gy, gm, gd, data = null) {
  const t = Date.UTC(gy, gm - 1, gd);

  // An official month start wins if the date is in the first 30 days after it.
  let best = null;
  for (const m of data?.months ?? []) {
    const [hy, hm] = String(m.month).split('-').map(Number);
    const [sy, sm, sd] = String(m.start).split('-').map(Number);
    const start = Date.UTC(sy, sm - 1, sd);
    const diff = Math.round((t - start) / DAY_MS);
    if (diff >= 0 && diff < 30 && (!best || start > best.start)) best = { start, hy, hm, hd: diff + 1 };
  }
  if (best) return { hy: best.hy, hm: best.hm, hd: best.hd };

  const adjust = Number.isInteger(data?.adjust) ? data.adjust : 0;
  return fromIntl(t + adjust * DAY_MS);
}
