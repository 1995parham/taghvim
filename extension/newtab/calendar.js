import { api, loadSettings } from '../lib/settings.js';
import { todayJalali, toGregorian, jalaliMonthLength, weekdaySat, jKey } from '../lib/jalali.js';
import { loadYearIndex, loadHijri, syncFromGitHub, filesFor, imageUrl, bundledUrl, repoUrl, pick } from '../lib/data.js';
import { toHijri } from '../lib/hijri.js';
import { t, num, hijriLabel, JALALI_MONTHS, GREGORIAN_MONTHS, HIJRI_MONTHS, WEEKDAYS, WEEKDAYS_SHORT } from '../lib/i18n.js';

const $ = (id) => document.getElementById(id);

const state = {
  settings: null,
  today: todayJalali(),
  view: null, // { jy, jm }
  selected: null, // { jy, jm, jd }
  index: new Map(),
  hijri: null, // hijri.json from the repo, or null
  indexYear: null,
  error: null,
  token: 0,
};

async function ensureIndex(jy, force = false) {
  if (!force && state.indexYear === jy) return;
  try {
    state.index = await loadYearIndex(state.settings, jy);
    state.error = null;
  } catch (err) {
    state.index = new Map();
    state.error = err.message;
  }
  state.indexYear = jy;

  // A year far from today (the user moved the calendar): check GitHub for it in the background.
  if (jy !== state.today.jy && jy !== state.today.jy + 1) {
    syncFromGitHub(state.settings, [`years/${jy}.json`]).then((changed) => {
      if (changed && state.view.jy === jy) render(true);
    });
  }
}

function gregorianLabel(g, lang) {
  return `${num(g.gd, lang)} ${GREGORIAN_MONTHS[lang][g.gm - 1]} ${num(g.gy, lang)}`;
}

function renderHeader() {
  const { lang } = state.settings;
  const { jy, jm } = state.view;
  $('month-j').textContent = `${JALALI_MONTHS[lang][jm - 1]} ${num(jy, lang)}`;

  const first = toGregorian(jy, jm, 1);
  const last = toGregorian(jy, jm, jalaliMonthLength(jy, jm));
  const m1 = GREGORIAN_MONTHS[lang][first.gm - 1];
  const m2 = GREGORIAN_MONTHS[lang][last.gm - 1];
  $('month-g').textContent = first.gy === last.gy
    ? `${m1} – ${m2} ${num(last.gy, lang)}`
    : `${m1} ${num(first.gy, lang)} – ${m2} ${num(last.gy, lang)}`;

  const h1 = toHijri(first.gy, first.gm, first.gd, state.hijri);
  const h2 = toHijri(last.gy, last.gm, last.gd, state.hijri);
  const hm1 = HIJRI_MONTHS[lang][h1.hm - 1];
  const hm2 = HIJRI_MONTHS[lang][h2.hm - 1];
  $('month-h').textContent = h1.hy === h2.hy
    ? `${hm1} – ${hm2} ${num(h2.hy, lang)}`
    : `${hm1} ${num(h1.hy, lang)} – ${hm2} ${num(h2.hy, lang)}`;
}

function renderGrid() {
  const { lang } = state.settings;
  const { jy, jm } = state.view;
  const days = $('days');
  days.replaceChildren();

  const first = toGregorian(jy, jm, 1);
  for (let i = 0; i < weekdaySat(first.gy, first.gm, first.gd); i += 1) {
    days.append(document.createElement('div'));
  }

  for (let jd = 1; jd <= jalaliMonthLength(jy, jm); jd += 1) {
    const g = toGregorian(jy, jm, jd);
    const events = state.index.get(jKey(jy, jm, jd)) ?? [];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'day';
    if (weekdaySat(g.gy, g.gm, g.gd) === 6) btn.classList.add('friday');
    if (events.some((e) => e.holiday)) btn.classList.add('holiday');
    if (events.length) btn.classList.add('has-event');
    if (jy === state.today.jy && jm === state.today.jm && jd === state.today.jd) btn.classList.add('today');
    const sel = state.selected;
    if (sel && sel.jy === jy && sel.jm === jm && sel.jd === jd) btn.classList.add('selected');

    const jSpan = document.createElement('span');
    jSpan.className = 'j';
    jSpan.textContent = num(jd, lang);
    const gSpan = document.createElement('span');
    gSpan.className = 'g';
    gSpan.textContent = num(g.gd, lang);
    btn.append(jSpan, gSpan);

    btn.title = [gregorianLabel(g, lang), ...events.map((e) => pick(e.title, lang))].join('\n');
    btn.addEventListener('click', () => {
      state.selected = { jy, jm, jd };
      renderGrid();
      renderDetails();
    });
    days.append(btn);
  }
}

function renderDetails() {
  const { lang } = state.settings;
  const { jy, jm, jd } = state.selected;
  const g = toGregorian(jy, jm, jd);
  const wd = weekdaySat(g.gy, g.gm, g.gd);

  $('sel-j').textContent = `${WEEKDAYS[lang][wd]} ${num(jd, lang)} ${JALALI_MONTHS[lang][jm - 1]} ${num(jy, lang)}`;
  $('sel-g').textContent = new Intl.DateTimeFormat(lang === 'fa' ? 'en-GB' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(g.gy, g.gm - 1, g.gd)));
  $('sel-h').textContent = hijriLabel(toHijri(g.gy, g.gm, g.gd, state.hijri), lang);

  const box = $('events');
  box.replaceChildren();
  const events = state.index.get(jKey(jy, jm, jd)) ?? [];
  if (!events.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = t(lang, 'noEvents');
    box.append(p);
    return;
  }

  const tpl = $('event-tpl');
  for (const ev of events) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    const img = node.querySelector('.event-img');
    const src = imageUrl(state.settings, ev.image);
    if (src) {
      // The copy inside the extension first (fast, offline); a new image comes from GitHub.
      const local = bundledUrl(ev.image);
      img.addEventListener('error', () => {
        if (img.src !== src) img.src = src;
        else img.remove();
      });
      img.src = local ?? src;
    } else {
      img.remove();
    }
    node.querySelector('.event-title').textContent = pick(ev.title, lang);
    const desc = pick(ev.description, lang);
    node.querySelector('.event-desc').textContent = desc;
    node.querySelector('.event-desc').title = desc;
    if (ev.holiday) {
      const tag = node.querySelector('.tag');
      tag.textContent = t(lang, 'holiday');
      tag.hidden = false;
    }
    box.append(node);
  }
}

function renderError() {
  const el = $('error');
  el.hidden = !state.error;
  el.textContent = state.error ? `${t(state.settings.lang, 'loadError')} ${state.error}` : '';
}

async function render(force = false) {
  const token = ++state.token;
  await ensureIndex(state.view.jy, force);
  if (token !== state.token) return; // a newer render started
  renderHeader();
  renderGrid();
  renderDetails();
  renderError();
}

function shiftMonth(delta) {
  let { jy, jm } = state.view;
  jm += delta;
  if (jm < 1) { jm = 12; jy -= 1; }
  if (jm > 12) { jm = 1; jy += 1; }
  state.view = { jy, jm };
  state.selected = { jy, jm, jd: 1 };
  render();
}

function applyLanguage() {
  const { lang } = state.settings;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  $('weekdays').replaceChildren(...WEEKDAYS_SHORT[lang].map((d) => {
    const el = document.createElement('div');
    el.textContent = d;
    return el;
  }));
  $('today').textContent = t(lang, 'today');
  $('prev').title = t(lang, 'prev');
  $('next').title = t(lang, 'next');
  $('refresh').title = t(lang, 'refresh');
  $('settings').title = t(lang, 'settings');
  const { owner, repo } = state.settings;
  $('source').textContent = `${owner}/${repo}`;
  $('source').title = t(lang, 'source');
  $('source').href = repoUrl(state.settings);
}

async function main() {
  state.settings = await loadSettings();
  state.hijri = await loadHijri(state.settings);
  state.view = { jy: state.today.jy, jm: state.today.jm };
  state.selected = { ...state.today };
  applyLanguage();

  // In RTL the "previous" button sits on the right, so its arrow points right.
  $('prev').addEventListener('click', () => shiftMonth(-1));
  $('next').addEventListener('click', () => shiftMonth(1));
  $('today').addEventListener('click', () => {
    state.view = { jy: state.today.jy, jm: state.today.jm };
    state.selected = { ...state.today };
    render();
  });
  $('refresh').addEventListener('click', async () => {
    const btn = $('refresh');
    btn.disabled = true;
    const years = new Set([state.today.jy, state.today.jy + 1, state.view.jy]);
    await syncFromGitHub(state.settings, filesFor([...years]), { force: true });
    location.reload(); // newtab.js renders its parts again too
  });
  $('settings').addEventListener('click', () => api.runtime.openOptionsPage());

  // newtab.js checks GitHub after the first render; render again if the data changed.
  window.addEventListener('taghvim:data-changed', async () => {
    state.hijri = await loadHijri(state.settings);
    render(true);
  });

  await render();
}

main();
