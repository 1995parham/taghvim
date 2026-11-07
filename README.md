# Taghvim

Taghvim is a browser extension for Chrome, Firefox, and Safari. It replaces the new tab page. It shows the Jalali (Solar Hijri), Gregorian, and Hijri (lunar) dates together. It gets holidays, short descriptions, and images from a public GitHub repository.

## Features

- A clock, today's Jalali, Gregorian, and Hijri date, the events of today, and the events of the next 60 days.
- A month view in the Jalali calendar. Each day also shows the Gregorian day number.
- The week starts on Saturday. Fridays and holidays show in red.
- The details panel shows the full Jalali and Gregorian date, and the events of the selected day. Each event has a title, a description of one or two lines, and an optional image.
- A different background photo each day from the data repository, with its location written over the photo.
- Works offline: the page keeps the data and the photos on the computer, and downloads the photos of the next 3 days in advance. The extension also contains a copy of the data (`extension/data/`, made by `scripts/sync-data.sh` at each build), so holidays show offline even on the first run.
- Persian (RTL) and English user interfaces.
- The extension keeps the data in a local cache for six hours. If GitHub is not available, the extension uses the last copy.
- No external libraries and no build step. The Jalali conversion is in `extension/lib/jalali.js`, and a test compares it with the ICU Persian calendar for each day from 1950 to 2100.

## Layout

```
extension/            the WebExtension (Manifest V3), the same code for all browsers
  manifest.json
  newtab/             the new tab page: calendar.js (the calendar card) and newtab.js (clock, today, upcoming)
  options/            the settings page (repository, branch, language)
  lib/                jalali.js, hijri.js, backgrounds.js, data.js, i18n.js, settings.js
extension/data/       a copy of the data repository inside the extension, for offline use
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

Taghvim then stays installed after Firefox restarts. To update, install the `.xpi` file of the new version in the same way.

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

The `release` workflow makes a GitHub release when you push a tag `v<version>`:

1. Change `version` in `extension/manifest.json`, for example to `1.4.0`, and commit the change.
2. Run `git tag v1.4.0` and `git push origin main v1.4.0`.

The workflow does these steps:
1. It stops if the tag and the manifest version are not the same.
2. It runs the tests.
3. It gets the latest data from the data repository.
4. It builds the packages.
5. It makes the release with the `.zip` and `.xpi` files.

If the repository has the secrets `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` (API keys from https://addons.mozilla.org/developers/addon/api/key/), the workflow also gets a Mozilla signature for the add-on as an unlisted add-on. It then adds `taghvim-<version>-signed.xpi` to the release. The normal release of Firefox can install this file permanently.

The `ci` workflow runs the tests and the build on each push and pull request.

## Permissions

- `storage`: the settings and the data cache.

The extension does not need host permissions. `raw.githubusercontent.com` sends CORS headers, so the page can read the JSON files directly.

## Background photos

The daily photos come from `backgrounds.json` in the data repository (see `data-repo/README.md`). The extension also contains one photo, which it shows before it has downloaded any photo and when it is offline for the first time. This photo shows the Pont del Petroli in Badalona, Catalonia, Spain, at sunset: [01 Platja de l'Estació al capvespre (Badalona), al fons el pont del Petroli](https://commons.wikimedia.org/wiki/File:01_Platja_de_l%27Estaci%C3%B3_al_capvespre_(Badalona),_al_fons_el_pont_del_Petroli.jpg) by Enric, licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The file `extension/newtab/background.jpg` is a copy resized to 2560 × 1920. The page shows the location and the credit of each photo in the bottom-right corner. Do not remove the credit, because the photo licenses require it.
