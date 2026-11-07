import { api, DEFAULTS, loadDefaults, loadSettings, saveSettings } from '../lib/settings.js';
import { rawUrl, clearCache } from '../lib/data.js';
import { todayJalali } from '../lib/jalali.js';

const form = document.getElementById('form');
const status = document.getElementById('status');

function show(msg, ok) {
  status.textContent = msg;
  status.className = ok ? 'ok' : 'bad';
}

function read() {
  const fd = new FormData(form);
  return Object.fromEntries(Object.keys(DEFAULTS).map((k) => [
    k,
    typeof DEFAULTS[k] === 'boolean' ? form.elements[k].checked : String(fd.get(k) ?? '').trim(),
  ]));
}

function fill(values) {
  for (const [k, v] of Object.entries(values)) {
    const el = form.elements[k];
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = Boolean(v);
    else el.value = v;
  }
}

// The most visited sites need the optional topSites permission. Ask for it when the box
// is checked (this must happen in the click handler). In Safari, which has no topSites API,
// the request fails and the box stays unchecked.
const topSitesBox = form.elements.topSites;
if (!api.permissions?.request) topSitesBox.closest('label').hidden = true;
topSitesBox.addEventListener('change', async () => {
  if (!topSitesBox.checked) return;
  try {
    topSitesBox.checked = await api.permissions.request({ permissions: ['topSites'] });
  } catch {
    topSitesBox.checked = false;
  }
  if (!topSitesBox.checked) show('The browser did not allow access to the most visited sites.', false);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await saveSettings(read());
  await clearCache();
  show('Saved.', true);
});

document.getElementById('reset').addEventListener('click', async () => {
  fill(await loadDefaults());
  show('Defaults restored. Click Save to keep them.', true);
});

document.getElementById('test').addEventListener('click', async () => {
  const s = read();
  const { jy } = todayJalali();
  const results = [];
  for (const path of ['recurring.json', `years/${jy}.json`]) {
    try {
      const res = await fetch(rawUrl(s, path), { cache: 'no-cache' });
      if (!res.ok) { results.push(`${path}: HTTP ${res.status}`); continue; }
      const data = await res.json();
      results.push(`${path}: ${data.events?.length ?? 0} events`);
    } catch (err) {
      results.push(`${path}: ${err.message}`);
    }
  }
  show(results.join(' · '), results.every((r) => r.includes('events')));
});

fill(await loadSettings());
