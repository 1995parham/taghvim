// Extra parts of the new tab page. calendar.js renders the calendar card.
import { loadSettings } from '../lib/settings.js';
import { todayJalali, toGregorian, toJalali, weekdaySat, jKey } from '../lib/jalali.js';
import { loadYearIndex, loadHijri, loadBackgroundList, imageUrl, bundledUrl, pick } from '../lib/data.js';
import { toHijri } from '../lib/hijri.js';
import { BUILTIN, resolveBackground, prefetchBackgrounds, dayNumber } from '../lib/backgrounds.js';
import { num, hijriLabel, JALALI_MONTHS, GREGORIAN_MONTHS, WEEKDAYS } from '../lib/i18n.js';

const $ = (id) => document.getElementById(id);
const UPCOMING_DAYS = 60;
const UPCOMING_MAX = 6;

function tickClock(lang) {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  $('clock').textContent = num(`${hh}:${mm}`, lang);
}

async function indexes(s, years) {
  const out = new Map();
  for (const y of years) {
    try {
      for (const [k, v] of await loadYearIndex(s, y)) out.set(k, v);
    } catch {
      // calendar.js shows the load error.
    }
  }
  return out;
}

function renderHero(s, j, events, hijri) {
  const { lang } = s;
  const g = toGregorian(j.jy, j.jm, j.jd);
  $('hero-weekday').textContent = WEEKDAYS[lang][weekdaySat(g.gy, g.gm, g.gd)];
  $('hero-j').textContent = `${num(j.jd, lang)} ${JALALI_MONTHS[lang][j.jm - 1]} ${num(j.jy, lang)}`;
  $('hero-g').textContent = `${num(g.gd, lang)} ${GREGORIAN_MONTHS[lang][g.gm - 1]} ${num(g.gy, lang)}`;
  $('hero-h').textContent = hijriLabel(toHijri(g.gy, g.gm, g.gd, hijri), lang);
  $('hero-events').replaceChildren(...events.map((ev) => {
    const chip = document.createElement('span');
    chip.className = ev.holiday ? 'chip holiday' : 'chip';
    chip.textContent = pick(ev.title, lang);
    chip.title = pick(ev.description, lang);
    return chip;
  }));
}

function renderUpcoming(s, j, index) {
  const { lang } = s;
  $('upcoming-title').textContent = lang === 'fa' ? 'رویدادهای پیش رو' : 'Upcoming';
  const list = $('upcoming');
  list.replaceChildren();

  const start = toGregorian(j.jy, j.jm, j.jd);
  const base = Date.UTC(start.gy, start.gm - 1, start.gd);
  for (let i = 1; i <= UPCOMING_DAYS && list.children.length < UPCOMING_MAX; i += 1) {
    const d = new Date(base + i * 86400000);
    const dj = toJalali(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    for (const ev of index.get(jKey(dj.jy, dj.jm, dj.jd)) ?? []) {
      if (list.children.length >= UPCOMING_MAX) break;
      const li = document.createElement('li');

      const src = imageUrl(s, ev.image);
      let thumb;
      if (src) {
        thumb = document.createElement('img');
        thumb.alt = '';
        const local = bundledUrl(ev.image);
        const img = thumb;
        img.addEventListener('error', () => {
          if (local && img.src !== local) img.src = local;
          else img.style.visibility = 'hidden';
        });
        img.src = src;
      } else {
        thumb = document.createElement('div');
        thumb.className = 'ph';
        thumb.textContent = num(dj.jd, lang);
      }

      const info = document.createElement('div');
      info.className = 'info';
      const name = document.createElement('div');
      name.className = ev.holiday ? 'name holiday' : 'name';
      name.textContent = pick(ev.title, lang);
      const when = document.createElement('div');
      when.className = 'when';
      when.textContent = `${WEEKDAYS[lang][weekdaySat(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())]} `
        + `${num(dj.jd, lang)} ${JALALI_MONTHS[lang][dj.jm - 1]} · `
        + `${num(d.getUTCDate(), lang)} ${GREGORIAN_MONTHS[lang][d.getUTCMonth()]}`;
      info.append(name, when);

      const left = document.createElement('div');
      left.className = 'left';
      left.textContent = lang === 'fa' ? `${num(i, 'fa')} روز دیگر` : `in ${i} day${i > 1 ? 's' : ''}`;

      li.title = pick(ev.description, lang);
      li.append(thumb, info, left);
      list.append(li);
    }
  }

  if (!list.children.length) {
    const li = document.createElement('li');
    li.textContent = lang === 'fa' ? 'رویدادی در ۶۰ روز آینده ثبت نشده است.' : 'No events in the next 60 days.';
    list.append(li);
  }
}

function renderLocation(s, entry) {
  const { lang } = s;
  $('loc-place').textContent = pick(entry.place, lang);
  $('loc-region').textContent = pick(entry.region, lang);
  const credit = $('loc-credit');
  credit.textContent = entry.credit ?? '';
  if (/^https:\/\//.test(entry.source ?? '')) credit.href = entry.source;
  else credit.removeAttribute('href');
  document.querySelector('.location').hidden = !pick(entry.place, lang);
}

async function renderBackground(s) {
  const list = await loadBackgroundList(s).catch(() => []);
  const { entry, src } = await resolveBackground(s, list);
  const img = $('bg-img');
  img.style.objectPosition = entry.position ?? 'center';
  img.addEventListener('load', () => img.classList.add('ready'), { once: true });
  img.addEventListener('error', () => {
    // A broken photo: use the photo inside the extension.
    img.style.objectPosition = BUILTIN.position;
    img.src = BUILTIN.src;
    renderLocation(s, BUILTIN);
  }, { once: true });
  img.src = src;
  renderLocation(s, entry);
  // Save the next days' photos for offline use, after the page is ready.
  setTimeout(() => prefetchBackgrounds(s, list, dayNumber()), 3000);
}

async function main() {
  const s = await loadSettings();
  document.title = s.lang === 'fa' ? 'زبانه جدید' : 'New Tab';
  renderBackground(s);
  tickClock(s.lang);
  setInterval(() => tickClock(s.lang), 1000);

  const j = todayJalali();
  // The next 60 days can cross into the next Jalali year.
  const [index, hijri] = await Promise.all([
    indexes(s, [j.jy, j.jy + 1]),
    loadHijri(s).catch(() => null),
  ]);
  renderHero(s, j, index.get(jKey(j.jy, j.jm, j.jd)) ?? [], hijri);
  renderUpcoming(s, j, index);
}

main();
