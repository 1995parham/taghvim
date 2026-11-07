#!/usr/bin/env bash
# Builds store packages into dist/.
#   ./scripts/build.sh            -> dist/taghvim-chrome-<v>.zip, dist/taghvim-firefox-<v>.zip, dist/taghvim-<v>.xpi
#   ./scripts/build.sh safari     -> also creates an Xcode project in dist/safari (macOS + Xcode)
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(node -p "require('./extension/manifest.json').version")
rm -rf dist && mkdir -p dist

# Copy the data into the extension, for offline use on the first run.
# Without data-repo/, the build uses the copy that is already in extension/data/.
if [[ -d data-repo ]]; then
  ./scripts/sync-data.sh
else
  echo "data-repo/ not found: using the existing extension/data/"
fi

# Chrome / Edge / Opera.
(cd extension && zip -qr "../dist/taghvim-chrome-${version}.zip" . -x '.*')

# Firefox (the same files; a separate name for the store upload).
(cd extension && zip -qr "../dist/taghvim-firefox-${version}.zip" . -x '.*')

# Firefox install from a file ("Install Add-on From File" needs the .xpi extension).
cp "dist/taghvim-firefox-${version}.zip" "dist/taghvim-${version}.xpi"

if [[ "${1:-}" == "safari" ]]; then
  xcrun safari-web-extension-converter extension \
    --project-location dist/safari \
    --app-name Taghvim \
    --bundle-identifier io.github.1995parham.taghvim \
    --swift --no-open --force
fi

ls -1 dist
