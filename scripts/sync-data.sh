#!/usr/bin/env bash
# Copies the data repository into extension/data/. The extension uses this copy
# when GitHub is not available and it has no saved copy (for example, offline on the first run).
# Everything is copied, also the background photos, so the page never waits for the network.
#
# It also writes extension/data/source.json: the repository, branch, and commit of the data.
# The extension uses this repository as its default data source.
# Set DATA_REPOSITORY (owner/repo) and DATA_BRANCH to override what git reports.
set -euo pipefail
cd "$(dirname "$0")/.."
src=data-repo
dst=extension/data
rm -rf "$dst"
mkdir -p "$dst/years"
cp "$src/recurring.json" "$src/hijri.json" "$src/backgrounds.json" "$dst/"
cp "$src"/years/*.json "$dst/years/"
cp -R "$src/images" "$dst/images"
cp -R "$src/backgrounds" "$dst/backgrounds"
remote=$(git -C "$src" remote get-url origin 2>/dev/null || true)
repository=${DATA_REPOSITORY:-$(sed -E 's#^(git@github\.com:|https://github\.com/)##; s#\.git$##' <<<"$remote")}
branch=${DATA_BRANCH:-$(git -C "$src" rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)}
commit=$(git -C "$src" rev-parse HEAD 2>/dev/null || echo unknown)
if [[ ! "$repository" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
  echo "cannot find the data repository (set DATA_REPOSITORY=owner/repo)" >&2
  exit 1
fi
cat > "$dst/source.json" <<JSON
{
  "repository": "$repository",
  "branch": "$branch",
  "commit": "$commit"
}
JSON

echo "data copied to $dst: $(find "$dst" -type f | wc -l | tr -d ' ') files, from $repository@$branch ($commit)"
