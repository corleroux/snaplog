#!/usr/bin/env bash
# Renders agents-src/*.md into .opencode/agents/ substituting {{MODEL_*}} tokens from models.env. Re-runnable.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f models.env ] || { echo "Copy models.env.example to models.env and fill it in."; exit 1; }
set -a; source models.env; set +a
mkdir -p .opencode/agents
rm -f .opencode/agents/*.md
for f in agents-src/*.md; do
  out=".opencode/agents/$(basename "$f")"
  cp "$f" "$out"
  for var in MODEL_ORCHESTRATOR MODEL_PRODUCT MODEL_ARCHITECT MODEL_BUILDER MODEL_QA MODEL_DESIGN MODEL_REVIEWER; do
    val="${!var:-}"
    if [ -z "$val" ] || [[ "$val" == *CHANGE_ME* ]]; then echo "Set $var in models.env"; exit 1; fi
    sed -i.bak "s|{{${var}}}|${val}|g" "$out"
  done
  rm -f "$out.bak"
done
echo "Rendered $(ls .opencode/agents | wc -l) agents. Verify with: opencode agent list"
