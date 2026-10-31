#!/usr/bin/env bash
set -euo pipefail

# scripts/build-submission.sh
# Populates the public submission repo (corleroux/snaplog-meta-hackathon) with
# event work from this snaplog repo.
#
# For every task merged to staging, the script produces one incremental patch
# of files that existed at the hackathon baseline and were modified, deleted or
# renamed since the previous submission update. Files added since the baseline
# are copied verbatim in their current state.
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
  "*Zone.Identifier"
  "*.DS_Store"
  "eval/captures/*"
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
  PREV_COMMIT="$(git log --pretty=format:%B | grep -oE 'Source: corleroux/snaplog@[a-f0-9]+' | head -1 | cut -d@ -f2 || true)"
fi
cd - >/dev/null

if [[ -z "$PREV_COMMIT" ]]; then
  PREV_COMMIT="$(git rev-parse "$BASELINE_TAG")"
fi

PREV_SHORT="$(git rev-parse --short "$PREV_COMMIT")"

# --- classify files ---------------------------------------------------------

# Files modified/deleted/renamed/type-changed between PREV_COMMIT and HEAD
# that ALSO existed at the baseline. These are safe to express as patches
# against a baseline checkout.
MODIFIED_FILES=()
while IFS= read -r -d '' file; do
  [[ -z "$file" ]] && continue
  if git cat-file -e "$BASELINE_TAG:$file" 2>/dev/null; then
    MODIFIED_FILES+=("$file")
  fi
done < <(git diff --diff-filter=MDRT --name-only -z "${PREV_COMMIT}..${SOURCE_COMMIT}" || true)

# Files added since the baseline. These are copied verbatim in current state.
ADDED_FILES=()
while IFS= read -r -d '' file; do
  [[ -z "$file" ]] && continue
  if should_exclude "$file"; then
    echo "Excluding: $file"
    continue
  fi
  ADDED_FILES+=("$file")
done < <(git diff --diff-filter=A --name-only -z "$BASELINE_TAG..HEAD" || true)

# --- generate incremental patch for modified baseline files -----------------

mkdir -p "$SUB_REPO/$PATCH_DIR"

# Number patches sequentially so `git apply patches/*.patch` applies them in
# chronological order regardless of commit hash sorting.
SEQ_NUM=$(ls "$SUB_REPO/$PATCH_DIR"/[0-9][0-9][0-9][0-9]-*.patch 2>/dev/null | wc -l)
SEQ_NUM=$((SEQ_NUM + 1))
SEQ_PREFIX=$(printf "%04d" "$SEQ_NUM")

PATCH_NAME="${SEQ_PREFIX}-${PREV_SHORT}-to-${SOURCE_SHORT}.patch"
PATCH_PATH="$SUB_REPO/$PATCH_DIR/$PATCH_NAME"

if [[ ${#MODIFIED_FILES[@]} -gt 0 ]]; then
  git diff \
    --find-renames \
    --binary \
    "${PREV_COMMIT}..${SOURCE_COMMIT}" \
    -- "${MODIFIED_FILES[@]}" \
    > "$PATCH_PATH"
else
  rm -f "$PATCH_PATH"
  PATCH_NAME=""
fi

if [[ -n "$PATCH_NAME" && ! -s "$PATCH_PATH" ]]; then
  rm "$PATCH_PATH"
  PATCH_NAME=""
fi

# --- copy new files verbatim ------------------------------------------------

rm -rf "$SUB_REPO/$NEW_DIR"
mkdir -p "$SUB_REPO/$NEW_DIR"

NEW_FILES_COUNT=0
for file in "${ADDED_FILES[@]}"; do
  target="$SUB_REPO/$NEW_DIR/$file"
  mkdir -p "$(dirname "$target")"
  cp -a "$file" "$target"

  # Redact the Supabase project reference in the public copy so the submission
  # repo stays consistent with the rest of the docs, while the working repo
  # keeps the real identifier for development.
  if [[ "$file" == ".opencode/opencode.jsonc" ]]; then
    sed -i 's/project_ref=[a-z0-9]*/project_ref=<project-ref>/g' "$target"
  fi

  NEW_FILES_COUNT=$((NEW_FILES_COUNT + 1))
done

if [[ "$NEW_FILES_COUNT" -eq 0 ]]; then
  rmdir "$SUB_REPO/$NEW_DIR" 2>/dev/null || true
fi

# --- manifest --------------------------------------------------------------

MODIFIED_FILES_LIST="$(printf '%s\n' "${MODIFIED_FILES[@]}")"
ADDED_FILES_LIST="$(printf '%s\n' "${ADDED_FILES[@]}")"

cat > "$SUB_REPO/MANIFEST.md" <<EOF
# Submission manifest

Generated from [snaplog](https://github.com/corleroux/snaplog) at \`$SOURCE_COMMIT\`.

- Branch: \`$SOURCE_BRANCH\`
- Date: $SOURCE_DATE
- Baseline: [$BASELINE_TAG](https://github.com/corleroux/snaplog/releases/tag/$BASELINE_TAG)
- Previous source commit: \`$PREV_COMMIT\`
- Incremental patch: \`${PATCH_NAME:-_none_}\`

## Baseline files modified since previous submission update

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
