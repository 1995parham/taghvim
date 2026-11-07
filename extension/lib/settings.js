export const api = globalThis.browser ?? globalThis.chrome;

// Used only if the build has no data/source.json. The build sets the real default:
// the data repository that it copied (see scripts/sync-data.sh).
export const DEFAULTS = Object.freeze({
  owner: '1995parham',
  repo: 'taghvim-data',
  branch: 'main',
  lang: 'fa',
});

let defaults = null;

/** The defaults, with owner, repo, and branch from the data repository of the build. */
export async function loadDefaults() {
  if (defaults) return defaults;
  defaults = { ...DEFAULTS };
  try {
    const res = await fetch(api.runtime.getURL('data/source.json'));
    const src = await res.json();
    const [owner, repo] = String(src.repository).split('/');
    if (owner && repo) Object.assign(defaults, { owner, repo, branch: src.branch || 'main' });
  } catch {
    // No source.json: keep DEFAULTS.
  }
  return defaults;
}

export async function loadSettings() {
  const base = await loadDefaults();
  const stored = await api.storage.sync.get(Object.keys(DEFAULTS));
  return { ...base, ...stored };
}

export async function saveSettings(values) {
  await api.storage.sync.set(values);
}
