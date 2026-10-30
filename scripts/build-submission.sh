#!/usr/bin/env bash
set -euo pipefail

# scripts/build-submission.sh
# Populates the public submission repo (corleroux/snaplog-meta-hackathon) with
# event work from this snaplog repo.
#
# For every task merged to staging, the script produces one incremental patch
# of files modified/renamed/deleted since the previous submission update, plus
# a verbatim copy of every file added since the hackathon baseline.
#
# Usage:
#   ./scripts/build-submission.sh [../snaplog-meta-hackathon]
#
# Run this from the root of the snaplog repo, on the staging branch, after each
# task merges.

SUB_REPO="${1:-../snaplog-meta-hackathon}"
BASELINE_TAG="hackathon-baseline"
PATCH_DIR="patches"
NEW_DIR="new-files"

# Files that are event work but should not be published to the submission repo.
# Shell glob patterns, matched with `case`.
EXCLUDE_PATTERNS=(
  "verification-todo.md"
  "docs/hackathon-status-update.md"
  "*.Zone.Identifier"
  "*.DS_Store"
)

# --- helpers ---------------------------------------------------------------

should_exclude() {
  local path="$1"
  for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    case "$path" in
      $pattern) return 0 ;;
    esac
  done
  return 1
}

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

if [[ "$SOURCE_BRANCH" != "staging" ]]; then
  echo "Error: current branch is '$SOURCE_BRANCH'; run this script on 'staging' after merging the task." >&2
  exit 1
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

# --- determine the previous source commit ----------------------------------

PREV_COMMIT=""
cd "$SUB_REPO"
if git rev-parse HEAD >/dev/null 2>&1; then
  PREV_COMMIT="$(git log -1 --pretty=format:%B | grep -oE 'Source: corleroux/snaplog@[a-f0-9]+' | tail -1 | cut -d@ -f2 || true)"
fi
cd - >/dev/null

if [[ -z "$PREV_COMMIT" ]]; then
  PREV_COMMIT="$(git rev-parse "$BASELINE_TAG")"
fi

PREV_SHORT="$(git rev-parse --short "$PREV_COMMIT")"

# --- generate incremental patch for modified files -------------------------

mkdir -p "$SUB_REPO/$PATCH_DIR"

PATCH_NAME="${PREV_SHORT}-to-${SOURCE_SHORT}.patch"
PATCH_PATH="$SUB_REPO/$PATCH_DIR/$PATCH_NAME"

# M = modified, D = deleted, R = renamed, T = type-changed.
# --binary ensures binary files are represented in the patch.
git diff \
  --find-renames \
  --binary \
  --diff-filter=MDRT \
  "${PREV_COMMIT}..${SOURCE_COMMIT}" \
  > "$PATCH_PATH"

if [[ ! -s "$PATCH_PATH" ]]; then
  rm "$PATCH_PATH"
  PATCH_NAME=""
fi

# --- copy new files verbatim -----------------------------------------------

rm -rf "$SUB_REPO/$NEW_DIR"
mkdir -p "$SUB_REPO/$NEW_DIR"

NEW_FILES_COUNT=0
while IFS= read -r -d '' file; do
  [[ -z "$file" ]] && continue
  if should_exclude "$file"; then
    echo "Excluding: $file"
    continue
  fi
  target="$SUB_REPO/$NEW_DIR/$file"
  mkdir -p "$(dirname "$target")"
  cp -a "$file" "$target"
  NEW_FILES_COUNT=$((NEW_FILES_COUNT + 1))
done < <(git diff --diff-filter=A --name-only -z "$BASELINE_TAG..HEAD" || true)

if [[ "$NEW_FILES_COUNT" -eq 0 ]]; then
  rmdir "$SUB_REPO/$NEW_DIR" 2>/dev/null || true
fi

# --- manifest --------------------------------------------------------------

MODIFIED_FILES_LIST="$(git diff --diff-filter=MDRT --name-only "$BASELINE_TAG..HEAD" || true)"
ADDED_FILES_LIST="$(git diff --diff-filter=A --name-only "$BASELINE_TAG..HEAD" || true)"

cat > "$SUB_REPO/MANIFEST.md" <<EOF
# Submission manifest

Generated from [snaplog](https://github.com/corleroux/snaplog) at \`$SOURCE_COMMIT\`.

- Branch: \`$SOURCE_BRANCH\`
- Date: $SOURCE_DATE
- Baseline: [$BASELINE_TAG](https://github.com/corleroux/snaplog/releases/tag/$BASELINE_TAG)
- Previous source commit: \`$PREV_COMMIT\`
- Incremental patch: \`${PATCH_NAME:-_none_}\`

## Files modified since baseline

${MODIFIED_FILES_LIST:-_none_}

## Files added since baseline (copied verbatim to \`$NEW_DIR/\`)

${ADDED_FILES_LIST:-_none_}
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
- Previous source: ${PREV_COMMIT}
- Patch: ${PATCH_NAME:-_none_}
- Generated: ${SOURCE_DATE}"

git push origin HEAD

echo "Submission repo updated: $SUB_REPO_ABS"
