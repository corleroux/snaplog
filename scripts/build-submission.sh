#!/usr/bin/env bash
set -euo pipefail

# scripts/build-submission.sh
# Populates the public submission repo (snaplog-meta-hackathon) with the
# event work from this snaplog repo: patches for files modified since the
# hackathon baseline, plus verbatim copies of new files.
#
# Usage:
#   ./scripts/build-submission.sh [../snaplog-meta-hackathon]
#
# Run this from the root of the snaplog repo, on the staging branch (or a
# task branch that has been merged to staging), after each task merges.

SUB_REPO="${1:-../snaplog-meta-hackathon}"
BASELINE_TAG="hackathon-baseline"
PATCH_DIR="patches"
NEW_DIR="new-files"

# --- sanity checks ---------------------------------------------------------

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: must be run inside the snaplog git repository." >&2
  exit 1
fi

if ! git rev-parse "$BASELINE_TAG" >/dev/null 2>&1; then
  echo "Error: baseline tag '$BASELINE_TAG' not found." >&2
  exit 1
fi

SOURCE_COMMIT="$(git rev-parse HEAD)"
SOURCE_SHORT="$(git rev-parse --short HEAD)"
SOURCE_DATE="$(git log -1 --format=%cd --date=iso-strict HEAD)"
SOURCE_BRANCH="$(git branch --show-current)"

if [[ "$SOURCE_BRANCH" != "staging" && "$SOURCE_BRANCH" != task/* ]]; then
  echo "Warning: current branch is '$SOURCE_BRANCH', expected 'staging' or 'task/*'." >&2
  read -rp "Continue? [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]] || exit 1
fi

# --- submission repo setup -------------------------------------------------

mkdir -p "$SUB_REPO"
cd "$SUB_REPO"
SUB_REPO_ABS="$(pwd)"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: '$SUB_REPO' is not a git repository." >&2
  echo "Create the public repo first, clone it, then re-run this script." >&2
  echo "Example: gh repo create corleroux/snaplog-meta-hackathon --public --clone" >&2
  exit 1
fi

cd - >/dev/null

# --- generate patches for modified files -----------------------------------

mkdir -p "$SUB_REPO/$PATCH_DIR"

# All changes *except* pure additions go into the patch so that the baseline
# checkout can be transformed cleanly. Additions are copied verbatim below.
git diff \
  --find-renames \
  --diff-filter=MDR \
  "$BASELINE_TAG..HEAD" \
  > "$SUB_REPO/$PATCH_DIR/snaplog-modified.patch"

if [[ ! -s "$SUB_REPO/$PATCH_DIR/snaplog-modified.patch" ]]; then
  rm "$SUB_REPO/$PATCH_DIR/snaplog-modified.patch"
fi

# --- copy new files verbatim -----------------------------------------------

rm -rf "$SUB_REPO/$NEW_DIR"
mkdir -p "$SUB_REPO/$NEW_DIR"

NEW_FILES_COUNT=0
while IFS= read -r -d '' file; do
  [[ -z "$file" ]] && continue
  target="$SUB_REPO/$NEW_DIR/$file"
  mkdir -p "$(dirname "$target")"
  cp -a "$file" "$target"
  NEW_FILES_COUNT=$((NEW_FILES_COUNT + 1))
done < <(git diff --diff-filter=A --name-only -z "$BASELINE_TAG..HEAD" || true)

if [[ "$NEW_FILES_COUNT" -eq 0 ]]; then
  rmdir "$SUB_REPO/$NEW_DIR" 2>/dev/null || true
fi

# --- manifest --------------------------------------------------------------

cat > "$SUB_REPO/MANIFEST.md" <<EOF
# Submission manifest

Generated from [snaplog](https://github.com/corleroux/snaplog) at \`$SOURCE_COMMIT\`.

- Branch: \`$SOURCE_BRANCH\`
- Date: $SOURCE_DATE
- Baseline: [$BASELINE_TAG](https://github.com/corleroux/snaplog/releases/tag/$BASELINE_TAG)

## Files modified since baseline

$(git diff --diff-filter=MDR --name-only "$BASELINE_TAG..HEAD" || echo "_none_")

## Files added since baseline (copied verbatim to \`$NEW_DIR/\`)

$(git diff --diff-filter=A --name-only "$BASELINE_TAG..HEAD" || echo "_none_")
EOF

# --- commit and push -------------------------------------------------------

cd "$SUB_REPO"

git add -A

if git diff --cached --quiet; then
  echo "No changes to publish to submission repo."
  exit 0
fi

git commit -m "Update submission from snaplog@${SOURCE_SHORT}

- Source: corleroux/snaplog@${SOURCE_COMMIT}
- Branch: ${SOURCE_BRANCH}
- Baseline: ${BASELINE_TAG}
- Generated: ${SOURCE_DATE}"

git push origin HEAD

echo "Submission repo updated: $SUB_REPO_ABS"
