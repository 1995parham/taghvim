// Search engines for the search box of the new tab page. "none" hides the box.
export const ENGINES = Object.freeze({
  google: { name: 'Google', url: 'https://www.google.com/search?q=' },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' },
});

export function searchUrl(engine, query) {
  const e = ENGINES[engine] ?? ENGINES.google;
  return e.url + encodeURIComponent(query);
}
