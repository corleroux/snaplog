#!/usr/bin/env bash
# Local CI testing via act — validates mobile build workflows without consuming EAS credits.
#
# Usage:
#   ./scripts/test-mobile-ci.sh              # Validate both workflows (dry-run)
#   ./scripts/test-mobile-ci.sh --staging     # Test staging workflow (dry-run)
#   ./scripts/test-mobile-ci.sh --production  # Test production workflow (dry-run)
#   ./scripts/test-mobile-ci.sh --real        # Run with REAL EAS builds (consumes credits!)
#
# Prerequisites:
#   - act installed (https://nektos.pages.dev/usage/installing.html)
#   - Docker running
#   - .env.act file present (auto-created on first run)

set -euo pipefail

WORKDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$WORKDIR/.env.act"

if ! command -v act >/dev/null 2>&1; then
  echo "ERROR: act is not installed. See https://nektos.pages.dev/usage/installing.html"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is not running. Start Docker first."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Creating .env.act with SKIP_EAS_BUILD=true (dry-run mode)..."
  cat > "$ENV_FILE" << 'EOF'
SKIP_EAS_BUILD=true
EXPO_TOKEN=dummy-token-for-dry-run
EOF
fi

REAL_BUILD=false
WORKFLOW=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --staging)
      WORKFLOW="mobile-build-staging"
      shift
      ;;
    --production)
      WORKFLOW="mobile-build"
      shift
      ;;
    --real)
      REAL_BUILD=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--staging|--production|--real]"
      exit 1
      ;;
  esac
done

if $REAL_BUILD; then
  echo "WARNING: Running with REAL EAS builds. This will consume your Expo build credits."
  echo "Press Ctrl+C within 5 seconds to cancel..."
  sleep 5
  export SKIP_EAS_BUILD=false
  if grep -q "EXPO_TOKEN=dummy" "$ENV_FILE" 2>/dev/null; then
    echo "ERROR: .env.act still has dummy EXPO_TOKEN. Set your real token before running --real."
    exit 1
  fi
fi

if [[ -z "$WORKFLOW" ]]; then
  echo "=== Validating staging workflow ==="
  act push -W "$WORKDIR/.github/workflows/mobile-build-staging.yml" -n 2>&1
  echo ""
  echo "=== Validating production workflow ==="
  act workflow_dispatch -W "$WORKDIR/.github/workflows/mobile-build.yml" -n 2>&1
elif [[ "$WORKFLOW" == "mobile-build-staging" ]]; then
  echo "=== Testing staging workflow ==="
  act push -W "$WORKDIR/.github/workflows/mobile-build-staging.yml" -n 2>&1
elif [[ "$WORKFLOW" == "mobile-build" ]]; then
  echo "=== Testing production workflow ==="
  act workflow_dispatch -W "$WORKDIR/.github/workflows/mobile-build.yml" -n 2>&1
fi
