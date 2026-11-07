export const api = globalThis.browser ?? globalThis.chrome;

// Change these defaults to point the extension at your own data repository.
export const DEFAULTS = Object.freeze({
  owner: '1995parham',
  repo: 'taghvim-data',
  branch: 'main',
  lang: 'fa',
});

export async function loadSettings() {
  const stored = await api.storage.sync.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...stored };
}

export async function saveSettings(values) {
  await api.storage.sync.set(values);
}
