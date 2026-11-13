#!/usr/bin/env bash
# Runs on the server over SSH. Finds or installs Node, then builds and restarts the app.
set -uo pipefail

# main serves https://order4u.mmappdemo.space on port 3000.
# dev serves https://order4u-test.mmappdemo.space on port 3001.
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
NODE_VERSION=v22.21.0

case "$DEPLOY_BRANCH" in
  main)
    APP_DIR=/root/app/order4u
    PM2_NAME=order4u
    GIT_BRANCH=main
    APP_PORT=3000
    PUBLIC_URL=
    ;;
  dev)
    APP_DIR=/root/app/order4u_demo
    PM2_NAME=order4u-test
    GIT_BRANCH=dev
    APP_PORT=3001
    PUBLIC_URL=https://order4u-test.mmappdemo.space
    ;;
  *)
    echo "unsupported branch: $DEPLOY_BRANCH" >&2
    exit 1
    ;;
esac

step() {
  local name="$1"
  shift
  local log
  log=$(mktemp)
  echo "::group::${name}"
  set +e
  "$@" >"$log" 2>&1
  local code=$?
  set -e
  cat "$log"
  echo "::endgroup::"
  if [ "$code" -ne 0 ]; then
    local detail
    detail=$(tail -n 40 "$log" | tr '\n' ' ' | tr '%' ' ' | tr '\r' ' ' | cut -c1-4000)
    echo "::error title=${name}::${detail}"
    exit "$code"
  fi
}

ensure_node() {
  local npm_bin=""
  local candidate
  for candidate in /usr/local/bin/npm /usr/bin/npm "$HOME/.local/bin/npm"; do
    if [ -x "$candidate" ]; then
      npm_bin=$candidate
      break
    fi
  done
  if [ -z "$npm_bin" ] && [ -d "$HOME/.nvm/versions/node" ]; then
    npm_bin=$(find "$HOME/.nvm/versions/node" -maxdepth 3 -type f -path '*/bin/npm' 2>/dev/null | sort | tail -1 || true)
  fi
  if [ -z "$npm_bin" ] && [ -d "$HOME/.local/share/fnm" ]; then
    npm_bin=$(find "$HOME/.local/share/fnm" -type f -path '*/bin/npm' 2>/dev/null | sort | tail -1 || true)
  fi
  if [ -n "$npm_bin" ]; then
    export PATH="$(dirname "$npm_bin"):$PATH"
    return 0
  fi

  local arch
  case "$(uname -m)" in
    x86_64) arch=x64 ;;
    aarch64|arm64) arch=arm64 ;;
    *)
      echo "unsupported cpu: $(uname -m)" >&2
      return 1
      ;;
  esac
  local tarball="node-${NODE_VERSION}-linux-${arch}.tar.xz"
  curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/${tarball}" -o "/tmp/${tarball}"
  tar -xJf "/tmp/${tarball}" -C /usr/local --strip-components=1
  export PATH="/usr/local/bin:$PATH"
  hash -r
  command -v npm >/dev/null
}

install_deps() {
  cd "$APP_DIR"
  if npm ci; then
    return 0
  fi
  echo "npm ci could not use the lockfile; installing dependencies instead"
  npm install --no-audit --no-fund
}

sync_repo() {
  if [ ! -d "$APP_DIR/.git" ]; then
    echo "missing git checkout at $APP_DIR" >&2
    return 1
  fi
  cd "$APP_DIR"
  git fetch origin "$GIT_BRANCH"
  git checkout -f -B "$GIT_BRANCH" "origin/$GIT_BRANCH"
}

pin_runtime_env() {
  local file="$1"
  python3 - "$file" "$APP_PORT" "$PUBLIC_URL" <<'PY'
import sys
from pathlib import Path

path, port, public_url = sys.argv[1:]
file = Path(path)
lines = file.read_text().splitlines() if file.exists() else []
keys = {"PORT": port}
if public_url:
    keys["AUTH_URL"] = public_url
    keys["APP_URL"] = public_url
found = set()
updated = []
for line in lines:
    key = line.split("=", 1)[0]
    if key in keys:
        updated.append(f"{key}={keys[key]}")
        found.add(key)
    else:
        updated.append(line)
for key, value in keys.items():
    if key not in found:
        updated.append(f"{key}={value}")
file.parent.mkdir(parents=True, exist_ok=True)
file.write_text("\n".join(updated) + "\n")
PY
}

ensure_pm2() {
  if ! command -v pm2 >/dev/null 2>&1; then
    npm install -g pm2
  fi
}

restart_app() {
  cd "$APP_DIR"
  chmod +x scripts/start-production.sh
  pin_runtime_env "$APP_DIR/.env"
  pin_runtime_env "$APP_DIR/.env.local"
  if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    pm2 restart "$PM2_NAME" --update-env
  else
    PM2_APP_NAME="$PM2_NAME" pm2 start deploy/pm2/ecosystem.config.cjs
    pm2 save
  fi
}

step "Find or install Node.js" ensure_node
echo "::notice::node $(node -v) at $(command -v node), npm $(npm -v) at $(command -v npm)"
step "Update code" sync_repo
step "Install dependencies" install_deps
step "Build" npm run build
step "Update database" npx prisma db push --accept-data-loss
step "Rewrite ids to UUID" node scripts/migrate-ids-to-uuid.mjs
step "Restore foreign keys" npx prisma db push --accept-data-loss
step "Encrypt customer PII" npx tsx scripts/encrypt-customer-pii.ts
if [ "$DEPLOY_BRANCH" = "dev" ]; then
  step "Ensure demo users" npm run db:seed
else
  echo "::notice::Skipping demo seed on ${DEPLOY_BRANCH}"
fi
step "Ensure pm2" ensure_pm2
step "Restart app" restart_app
echo "Deploy finished"
