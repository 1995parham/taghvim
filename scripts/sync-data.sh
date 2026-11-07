#!/usr/bin/env bash
# Copies the data repository into extension/data/. The extension uses this copy
# when GitHub is not available and it has no saved copy (for example, offline on the first run).
# Background photos are not copied (too large); extension/newtab/background.jpg is the offline photo.
set -euo pipefail
cd "$(dirname "$0")/.."
src=data-repo
dst=extension/data
rm -rf "$dst"
mkdir -p "$dst/years"
cp "$src/recurring.json" "$src/hijri.json" "$dst/"
cp "$src"/years/*.json "$dst/years/"
cp -R "$src/images" "$dst/images"
echo "data copied to $dst: $(find "$dst" -type f | wc -l | tr -d ' ') files"
