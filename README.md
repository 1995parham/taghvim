# Taghvim

Taghvim is a browser extension for Chrome, Firefox, and Safari. It replaces the new tab page. It shows the Jalali (Solar Hijri), Gregorian, and Hijri (lunar) dates together. It gets holidays, short descriptions, and images from a public GitHub repository.

## Features

- A clock, today's Jalali, Gregorian, and Hijri date, the events of today, and the events of the next 60 days.
- A month view in the Jalali calendar. Each day also shows the Gregorian day number.
- The week starts on Saturday. Fridays and holidays show in red.
- The details panel shows the full Jalali and Gregorian date, and the events of the selected day. Each event has a title, a description of one or two lines, and an optional image.
- A different background photo each day from the data repository, with its location and a short description written over the photo. The ‹ › buttons change the photo; the choice stays for the rest of the day.
- Fast and offline first: the build contains all the data and all the photos (`extension/data/`, made by `scripts/sync-data.sh`). The page renders from the computer in less than 0.1 s and never waits for the network. After the first render, it checks GitHub (at most once in 10 minutes, with an 8-second time limit). If the data changed, it renders again. A photo that was added after the build fades in when its download completes.
- A search box (Google, DuckDuckGo, or Bing, or hidden) and, if you turn it on in the settings, your most visited sites.
- Persian (RTL) and English user interfaces.
- The ⟳ button checks GitHub immediately.
- No external libraries and no build step. The Jalali conversion is in `extension/lib/jalali.js`, and a test compares it with the ICU Persian calendar for each day from 1950 to 2100.

## Layout

```
extension/            the WebExtension (Manifest V3), the same code for all browsers
  manifest.json
  newtab/             the new tab page: calendar.js (the calendar card) and newtab.js (clock, today, upcoming)
  options/            the settings page (repository, branch, language)
  lib/                jalali.js, hijri.js, backgrounds.js, data.js, i18n.js, settings.js
extension/data/       a copy of the data repository (with the photos) inside the extension
data-repo/            the data repository (a separate git repository, not part of this one)
scripts/build.sh      makes the store packages in dist/ (it runs scripts/sync-data.sh first)
scripts/sync-data.sh  copies the data repository into extension/data/ for offline use
scripts/make-icons.mjs
tests/                node --test 'tests/*.test.mjs' ; tests/preview.html is a page preview without a browser install
```

## Data repository

The data is in a separate public repository, [1995parham/taghvim-data](https://github.com/1995parham/taghvim-data). For local development, clone it into `data-repo/`: `git clone git@github.com:1995parham/taghvim-data.git data-repo`. To use a different repository, set the owner and the repository name in the settings page of the extension, or change `DEFAULTS` in `extension/lib/settings.js`. The extension reads the files from `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/`. See `data-repo/README.md` for the file format.

## Development

1. Run the tests: `node --test 'tests/*.test.mjs'`
2. Preview the new tab page: run `python3 -m http.server 8000` in the project root, then open `http://localhost:8000/tests/preview.html?lang=fa&date=2026-03-21`. The preview uses the local `data-repo/` folder.

## Install

Download the files from the latest [release](https://github.com/1995parham/taghvim/releases/latest).

### Firefox ESR or Firefox Developer Edition (permanent install)

These Firefox versions can install an add-on without the signature of Mozilla.

CAUTION: Step 2 lets Firefox install all unsigned add-ons, not only Taghvim. Install only add-ons that you trust.

1. Open `about:config` and accept the warning.
2. Search for `xpinstall.signatures.required` and set it to `false`.
3. If a temporary Taghvim is loaded, remove it on `about:debugging#/runtime/this-firefox`.
4. Open `about:addons`, click ⚙ → "Install Add-on From File…", and select `taghvim-<version>.xpi`.
5. Open a new tab. If Firefox asks about the changed new tab page, click "Keep Changes".

Taghvim then stays installed after Firefox restarts. From version 1.6.0, Firefox also updates it automatically: the add-on reads `updates.json` from the latest GitHub release and installs a newer version itself (Firefox checks about once a day; to check now, open `about:addons`, click ⚙, and click "Check for Updates"). Install version 1.6.0 or later once by hand; older versions do not have the update address.

### Firefox (normal release)

The normal release of Firefox ignores `xpinstall.signatures.required`, so it installs only add-ons that Mozilla signed. If the release has a `taghvim-<version>-signed.xpi` file, install that file with step 4 above. If not, use a temporary install: open `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", and select the `.xpi` file. Firefox removes a temporary add-on when it restarts.

### Chrome or Edge

1. Unzip `taghvim-chrome-<version>.zip` to a folder that you keep. Chrome loads the extension from this folder each time.
2. Open `chrome://extensions` and turn on "Developer mode".
3. Click "Load unpacked" and select the folder.
4. Open a new tab. If Chrome asks "Change back to Google?", click "Keep it".

To update, replace the contents of the folder and click the reload button of Taghvim on `chrome://extensions`.

### Safari

Install Xcode, run `./scripts/build.sh safari`, open the project in `dist/safari`, and run it. Then turn on the extension in Safari > Settings > Extensions. For unsigned builds, first turn on Develop > Allow Unsigned Extensions.

### For development

- Chrome: "Load unpacked" with the `extension/` folder.
- Firefox: "Load Temporary Add-on" with `extension/manifest.json`.

## Build

Run `./scripts/build.sh`. The script copies `data-repo/` into `extension/data/` (if `data-repo/` exists), and makes these files in `dist/`:

- `taghvim-chrome-<version>.zip` for Chrome and the Chrome Web Store
- `taghvim-firefox-<version>.zip` for addons.mozilla.org
- `taghvim-<version>.xpi` for a Firefox install from a file

Run `./scripts/build.sh safari` to also make the Xcode project for Safari.

The extension has no toolbar button and no background script. To open the settings, click ⚙ on the new tab page. Firefox needs version 121 or later.

## Release

There are two kinds of release. Both are on the [releases page](https://github.com/1995parham/taghvim/releases), with the `.zip` and `.xpi` files.

### Code release

1. Change `version` in `extension/manifest.json`, for example to `1.5.0`, and commit the change.
2. Run `git tag v1.5.0` and `git push origin main v1.5.0`.

The `release` workflow stops if the tag and the manifest version are not the same. It runs the tests, builds the code of the tag with the latest data, and makes the release.

### Data release

A change to the [data repository](https://github.com/1995parham/taghvim-data) makes a new release automatically, so people can change the holidays and photos without a change to this repository. The workflow builds the code of the latest code release with the new data. The version adds the workflow run number, for example `1.5.0.12`. Thus the next code release (for example `1.5.1`) is always higher.

A data release starts in these ways:

- The data repository sends a `data-updated` event after each push to `main`. This needs the secret `TAGHVIM_RELEASE_TOKEN` in the data repository (see its README).
- A daily check at 03:17 UTC makes a release if the data changed since the last release.
- By hand: Actions → release → "Run workflow".

The notes of each release contain the data commit (`<!-- data-commit: … -->`). The workflow compares it to find changes.

### Use another data repository

To build the extension with a fork of the data repository, set these repository variables in Settings → Secrets and variables → Actions → Variables:

- `DATA_REPOSITORY`: `owner/repo` of the data, for example `someone/taghvim-data`
- `DATA_BRANCH`: the branch (default `main`)

The build writes the data repository into `extension/data/source.json`. The extension then uses it as its default data source, so the next release reads its updates from the fork. Locally, use `DATA_REPOSITORY=someone/taghvim-data ./scripts/build.sh`.

### Firefox signature

With the secrets `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` (API keys from https://addons.mozilla.org/developers/addon/api/key/), each release also gets a Mozilla signature for the add-on as an unlisted add-on. The workflow adds `taghvim-<version>-signed.xpi`, which all Firefox versions can install permanently.

The `ci` workflow runs the tests, the data check, the build, and `web-ext lint` on each push and pull request.

## Permissions

- `storage`: the settings and the data cache.
- `topSites` (optional): only if you turn on "Most visited sites" in the settings. The browser asks you first.

The extension does not need host permissions. `raw.githubusercontent.com` sends CORS headers, so the page can read the JSON files directly.

## Background photos

The daily photos come from `backgrounds.json` in the data repository (see `data-repo/README.md`). The photos are WebP files of about 400 KB, and the build copies all of them into `extension/data/backgrounds/`. If no photo list is available, the page shows the Pont del Petroli in Badalona, Catalonia, Spain, at sunset: [01 Platja de l'Estació al capvespre (Badalona), al fons el pont del Petroli](https://commons.wikimedia.org/wiki/File:01_Platja_de_l%27Estaci%C3%B3_al_capvespre_(Badalona),_al_fons_el_pont_del_Petroli.jpg) by Enric, licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The page shows the location and the credit of each photo in the bottom-right corner. Do not remove the credit, because the photo licenses require it.
