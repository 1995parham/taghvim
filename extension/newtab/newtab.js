// Extra parts of the new tab page. calendar.js renders the calendar card.
import { loadSettings } from '../lib/settings.js';
import { todayJalali, toGregorian, toJalali, weekdaySat, jKey } from '../lib/jalali.js';
import { loadYearIndex, loadHijri, loadBackgroundList, syncFromGitHub, filesFor, imageUrl, bundledUrl, pick } from '../lib/data.js';
import { toHijri } from '../lib/hijri.js';
import { BUILTIN, localBackground, downloadToday, prefetchBackgrounds, dayNumber } from '../lib/backgrounds.js';
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
        // The copy inside the extension first (fast, offline); a new image comes from GitHub.
        const local = bundledUrl(ev.image);
        const img = thumb;
        img.addEventListener('error', () => {
          if (img.src !== src) img.src = src;
          else img.style.visibility = 'hidden';
        });
        img.src = local ?? src;
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

let latestPhoto = null;

/**
 * Shows a photo. A new photo fades in over the old one, then the old one is removed.
 * Only the most recently requested photo stays, even if an older one loads later.
 */
function showPhoto(s, entry, src) {
  const box = document.querySelector('.bg');
  const img = document.createElement('img');
  img.alt = '';
  img.style.objectPosition = entry.position ?? 'center';
  latestPhoto = img;
  img.addEventListener('load', () => {
    if (img !== latestPhoto) {
      img.remove(); // a newer photo was requested
      return;
    }
    img.classList.add('ready');
    renderLocation(s, entry);
    setTimeout(() => {
      for (const old of box.querySelectorAll('img')) if (old !== latestPhoto) old.remove();
    }, 500);
  }, { once: true });
  img.addEventListener('error', () => {
    img.remove();
    // A broken photo: use the photo inside the extension.
    if (img === latestPhoto && entry !== BUILTIN) showPhoto(s, BUILTIN, BUILTIN.src);
  }, { once: true });
  img.src = src;
  box.append(img);
}

async function renderData(s, j) {
  // The next 60 days can cross into the next Jalali year.
  const [index, hijri] = await Promise.all([indexes(s, [j.jy, j.jy + 1]), loadHijri(s)]);
  renderHero(s, j, index.get(jKey(j.jy, j.jm, j.jd)) ?? [], hijri);
  renderUpcoming(s, j, index);
}

async function main() {
  const s = await loadSettings();
  document.title = s.lang === 'fa' ? 'زبانه جدید' : 'New Tab';
  tickClock(s.lang);
  setInterval(() => tickClock(s.lang), 1000);

  const j = todayJalali();
  const day = dayNumber();

  // 1. Render at once from the computer. Nothing here waits for the network.
  let list = await loadBackgroundList(s);
  const first = await localBackground(s, list, day);
  showPhoto(s, first.entry, first.src);
  await renderData(s, j);
  document.documentElement.dataset.renderedMs = String(Math.round(performance.now()));

  // 2. Then check GitHub, and render again only if the data changed.
  if (await syncFromGitHub(s, filesFor([j.jy, j.jy + 1]))) {
    await renderData(s, j);
    window.dispatchEvent(new CustomEvent('taghvim:data-changed'));
    list = await loadBackgroundList(s);
  }

  // 3. Fade in today's photo if it was not saved yet, then save the next days' photos.
  if (!first.isToday) {
    const today = await downloadToday(s, list, day);
    if (today) showPhoto(s, today.entry, today.src);
  }
  await prefetchBackgrounds(s, list, day);
}

main();
