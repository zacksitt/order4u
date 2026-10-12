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

# pm2 does not load .env files — export for Next/Auth/Prisma (Next also reads these from disk).
load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  set -a
  # shellcheck disable=SC1090
  source "$file"
  set +a
}

load_env_file "$ROOT/.env"
load_env_file "$ROOT/.env.local"
load_env_file "$ROOT/.env.production"
load_env_file "$ROOT/.env.production.local"

if [[ -z "${AUTH_SECRET:-}" ]]; then
  echo "error: AUTH_SECRET is not set. Add it to $ROOT/.env or .env.local"
  exit 1
fi

if [[ "${AUTH_URL:-}" == http://localhost* ]] && [[ "${NODE_ENV:-production}" == "production" ]]; then
  echo "warning: AUTH_URL is still localhost — set AUTH_URL and APP_URL to your public https URL"
fi

exec node "$ROOT/node_modules/next/dist/bin/next" start -H 127.0.0.1 -p 3000
