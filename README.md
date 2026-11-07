<div align="center">

<img src="extension/icons/icon-128.png" width="96" height="96" alt="Taghvim icon">

# Taghvim · تقویم

**A new tab page with the Jalali, Gregorian and Hijri calendars, holidays and a daily photo. Fast, and it works offline.**

[![ci](https://github.com/1995parham/taghvim/actions/workflows/ci.yml/badge.svg)](https://github.com/1995parham/taghvim/actions/workflows/ci.yml)
[![release](https://github.com/1995parham/taghvim/actions/workflows/release.yml/badge.svg)](https://github.com/1995parham/taghvim/actions/workflows/release.yml)
[![latest release](https://img.shields.io/github/v/release/1995parham/taghvim?label=latest&color=e2574c)](https://github.com/1995parham/taghvim/releases/latest)
![Manifest V3](https://img.shields.io/badge/manifest-V3-4285f4)
![Chrome](https://img.shields.io/badge/Chrome%20%2F%20Edge-supported-4285f4?logo=googlechrome&logoColor=white)
![Firefox 121+](https://img.shields.io/badge/Firefox-121%2B-ff7139?logo=firefoxbrowser&logoColor=white)
![Safari](https://img.shields.io/badge/Safari-supported-006cff?logo=safari&logoColor=white)

[Install](#-install) · [Features](#-features) · [Data](#-data-repository) · [Development](#-development) · [Release](#-release)

</div>

| فارسی | English |
| :---: | :---: |
| ![Taghvim in Persian](docs/screenshot-fa.jpg) | ![Taghvim in English](docs/screenshot-en.jpg) |

Taghvim replaces the new tab page of Chrome, Edge, Firefox and Safari. It shows the Jalali (Solar Hijri), Gregorian and Hijri (lunar) dates together. The holidays, their short descriptions and images, and the daily photos come from a public GitHub repository, [1995parham/taghvim-data](https://github.com/1995parham/taghvim-data), so anyone can correct a holiday or add a photo with a pull request.

## ✨ Features

- 🗓️ **Three calendars at once**: a clock, today's Jalali, Gregorian and Hijri date, the events of today, and the events of the next 60 days.
- 📅 **A Jalali month view** where each day also shows its Gregorian day number. The week starts on Saturday, and Fridays and holidays show in red.
- 🔎 **A details panel** with the full Jalali and Gregorian date and the events of the selected day. Each event has a title, a description of one or two lines, and an optional image.
- 🏞️ **A different photo each day**, with its location and a short description written over it. The ‹ › buttons change the photo, and the choice stays for the rest of the day.
- ⚡ **Offline first**: each build contains all the data and all the photos, so the page renders from the computer in less than 0.1 s and never waits for the network. After the first render, it checks GitHub (at most once in 10 minutes, with an 8-second time limit) and renders again if the data changed. A photo that was added after the build fades in when its download completes. The ⟳ button checks GitHub immediately.
- 🔍 **A search box** (Google, DuckDuckGo, Bing, or hidden) and, if you turn it on, your most visited sites.
- 🌐 **Persian (RTL) and English** user interfaces.
- 🪶 **No external libraries and no build step.** The Jalali conversion is in `extension/lib/jalali.js`, and a test compares it with the ICU Persian calendar for each day from 1950 to 2100.

## 📦 Install

Download the files from the [latest release](https://github.com/1995parham/taghvim/releases/latest). To open the settings after the install, click ⚙ on the new tab page: the extension has no toolbar button and no background script.

<details open>
<summary><b>🦊 Firefox</b></summary>

<br>

**Firefox ESR or Firefox Developer Edition** can install the unsigned add-on permanently:

1. Open `about:config`, accept the warning, search for `xpinstall.signatures.required`, and set it to `false`.
2. If a temporary Taghvim is loaded, remove it on `about:debugging#/runtime/this-firefox`.
3. Open `about:addons`, click ⚙ → "Install Add-on From File…", and select `taghvim-<version>.xpi`.
4. Open a new tab. If Firefox asks about the changed new tab page, click "Keep Changes".

> [!CAUTION]
> Step 1 lets Firefox install all unsigned add-ons, not only Taghvim. Install only add-ons that you trust.

**The normal release of Firefox** ignores `xpinstall.signatures.required` and installs only add-ons that Mozilla signed. If the release has a `taghvim-<version>-signed.xpi` file (see [Firefox signature](#firefox-signature)), install that file with steps 3 and 4. If not, use a temporary install: open `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", and select the `.xpi` file. Firefox removes a temporary add-on when it restarts.

**Updates**: from version 1.6.0, Firefox updates a permanent install automatically. The add-on reads `updates.json` from the latest GitHub release and installs a newer version itself. Firefox checks about once a day; to check now, open `about:addons`, click ⚙, and click "Check for Updates". Install version 1.6.0 or later once by hand, because older versions do not have the update address.

</details>

<details>
<summary><b>🌐 Chrome or Edge</b></summary>

<br>

1. Unzip `taghvim-chrome-<version>.zip` to a folder that you keep. Chrome loads the extension from this folder each time.
2. Open `chrome://extensions` and turn on "Developer mode".
3. Click "Load unpacked" and select the folder.
4. Open a new tab. If Chrome asks "Change back to Google?", click "Keep it".

An unpacked extension does not update automatically. To update, replace the contents of the folder and click the reload button of Taghvim on `chrome://extensions`. The page itself still gets new holidays and photos from GitHub without an update.

</details>

<details>
<summary><b>🧭 Safari</b></summary>

<br>

Install Xcode, run `./scripts/build.sh safari`, open the project in `dist/safari`, and run it. Then turn on the extension in Safari → Settings → Extensions. For unsigned builds, first turn on Develop → Allow Unsigned Extensions.

</details>

<details>
<summary><b>🛠️ From the source</b></summary>

<br>

- Chrome: "Load unpacked" with the `extension/` folder.
- Firefox: "Load Temporary Add-on" with `extension/manifest.json`.

</details>

## 🗃️ Data repository

The holidays, the Hijri corrections and the photos are in a separate public repository, [1995parham/taghvim-data](https://github.com/1995parham/taghvim-data). Its [README](https://github.com/1995parham/taghvim-data#readme) describes the file format, and its [CONTRIBUTING.md](https://github.com/1995parham/taghvim-data/blob/main/CONTRIBUTING.md) tells you how to change the data. A push to its `main` branch makes a new [data release](#data-release) of the extension.

The extension reads the files from `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/`. To use a different repository, set the owner, the repository and the branch on the settings page, or change `DEFAULTS` in `extension/lib/settings.js`. A build can also set its own default; see [Use another data repository](#use-another-data-repository).

`extension/data/` is a copy of the data repository, photos included, and it is committed to this repository. Thus a build without the data repository still works offline. `scripts/sync-data.sh` refreshes it from `data-repo/`, and `scripts/build.sh` runs it when `data-repo/` exists.

### 🏞️ Background photos

The daily photos come from `backgrounds.json` in the data repository. They are WebP files of about 400 KB. If no photo list is available, the page shows the Pont del Petroli in Badalona, Catalonia, Spain, at sunset: [01 Platja de l'Estació al capvespre (Badalona), al fons el pont del Petroli](https://commons.wikimedia.org/wiki/File:01_Platja_de_l%27Estaci%C3%B3_al_capvespre_(Badalona),_al_fons_el_pont_del_Petroli.jpg) by Enric, licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

> [!IMPORTANT]
> The page shows the location and the credit of each photo in the bottom corner. Do not remove the credit, because the photo licenses require it.

## 🔐 Permissions

| Permission | Why |
| --- | --- |
| `storage` | The settings and the data cache. |
| `topSites` (optional) | Only if you turn on "Most visited sites" in the settings. The browser asks you first. |

The extension needs no host permissions: `raw.githubusercontent.com` sends CORS headers, so the page reads the JSON files directly.

## 🧑‍💻 Development

```bash
git clone git@github.com:1995parham/taghvim.git
cd taghvim
git clone git@github.com:1995parham/taghvim-data.git data-repo   # optional, for local data

node --test 'tests/*.test.mjs'     # the tests
python3 -m http.server 8000        # then open the preview below
```

Open `http://localhost:8000/tests/preview.html?lang=fa&date=2026-03-21` to see the new tab page without a browser install. The preview reads the data from the local `data-repo/` folder. Add `&lang=en` for English, any `&date=` to see another day, and `&offline=1` to make the GitHub requests fail.

### Layout

```
extension/              the WebExtension (Manifest V3), the same code for all browsers
├── manifest.json
├── newtab/             the new tab page: calendar.js (the calendar card), newtab.js (clock, today, upcoming, photo)
├── options/            the settings page (data repository, language, search engine, most visited sites)
├── lib/                jalali.js, hijri.js, backgrounds.js, data.js, i18n.js, search.js, settings.js
├── icons/
└── data/               the committed copy of the data repository, with the photos
data-repo/              a local clone of taghvim-data (git-ignored)
scripts/
├── build.sh            makes the packages in dist/ (runs sync-data.sh first)
├── sync-data.sh        copies data-repo/ into extension/data/
└── make-icons.mjs
tests/                  node --test 'tests/*.test.mjs'; preview.html shows the page without a browser install
docs/                   the README screenshots
```

### Build

Run `./scripts/build.sh`. It makes these files in `dist/`:

| File | For |
| --- | --- |
| `taghvim-chrome-<version>.zip` | Chrome, Edge and the Chrome Web Store |
| `taghvim-firefox-<version>.zip` | addons.mozilla.org |
| `taghvim-<version>.xpi` | a Firefox install from a file |

Run `./scripts/build.sh safari` to also make the Xcode project for Safari.

The `ci` workflow runs on each push and pull request. It runs the tests, checks out the latest data repository and runs that repository's own `scripts/validate.mjs` on it, builds the packages, and runs `web-ext lint`.

## 🚀 Release

There are two kinds of release. Both are on the [releases page](https://github.com/1995parham/taghvim/releases), with the `.zip`, `.xpi` and `updates.json` files.

### Code release

1. Change `version` in `extension/manifest.json`, for example to `1.7.0`, and commit the change.
2. Run `git tag v1.7.0` and `git push origin main v1.7.0`.

The `release` workflow stops if the tag and the manifest version are not the same. It runs the tests, builds the code of the tag with the latest data, and makes the release.

### Data release

A change to the data repository makes a new release automatically, so people can change the holidays and photos without a change to this repository. The workflow builds the code of the latest code release with the new data. The version adds the workflow run number, for example `1.6.0.12`, so the next code release (for example `1.6.1`) is always higher.

A data release starts in one of these ways:

- 📨 The data repository sends a `data-updated` event after each push to `main`. This needs the secret `TAGHVIM_RELEASE_TOKEN` in the data repository (see its README).
- ⏰ A daily check at 03:17 UTC makes a release if the data changed since the last release.
- 🖐️ By hand: Actions → release → "Run workflow".

The notes of each release contain the data commit (`<!-- data-commit: … -->`). The workflow compares it to find changes.

### Use another data repository

To build the extension with a fork of the data repository, set these repository variables in Settings → Secrets and variables → Actions → Variables:

| Variable | Value |
| --- | --- |
| `DATA_REPOSITORY` | `owner/repo` of the data, for example `someone/taghvim-data` |
| `DATA_BRANCH` | the branch (default `main`) |

The build writes the data repository into `extension/data/source.json`. The extension then uses it as its default data source, so the next release reads its updates from the fork. Locally, use `DATA_REPOSITORY=someone/taghvim-data ./scripts/build.sh`.

### Firefox signature

With the secrets `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` (API keys from <https://addons.mozilla.org/developers/addon/api/key/>), each release also gets a Mozilla signature as an unlisted add-on. The workflow adds `taghvim-<version>-signed.xpi`, which all Firefox versions can install permanently.
