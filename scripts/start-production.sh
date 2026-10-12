#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$ROOT/.next/BUILD_ID" ]]; then
  echo "error: no production build at $ROOT/.next"
  echo "Run from this directory:"
  echo "  cd $ROOT && npm ci && npm run build"
  exit 1
fi

exec node "$ROOT/node_modules/next/dist/bin/next" start -H 127.0.0.1 -p 3000
