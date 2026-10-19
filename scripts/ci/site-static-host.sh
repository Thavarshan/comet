#!/usr/bin/env bash
# Exercise Cloudflare's static asset runtime without any account credentials.
set -euo pipefail
export WRANGLER_SEND_METRICS=false
export TURBO_TELEMETRY_DISABLED=1
export NEXT_TELEMETRY_DISABLED=1
comet_server_pid=''
comet_revision=$(git rev-parse HEAD)

stop_server() {
  if [ -n "$comet_server_pid" ]; then
    kill -- "-$comet_server_pid" 2>/dev/null || true
    wait "$comet_server_pid" 2>/dev/null || true
    comet_server_pid=''
  fi
}
trap stop_server EXIT

start_server() {
  local target="$1"
  local logfile="${RUNNER_TEMP:?}/comet-static-$target.log"
  setsid npm exec -w @comet/site -- wrangler dev --env "$target" \
    --local --ip 127.0.0.1 --port 8788 > "$logfile" 2>&1 &
  comet_server_pid=$!
  for _ in {1..30}; do
    if ! kill -0 "$comet_server_pid" 2>/dev/null; then
      cat "$logfile"
      return 1
    fi
    if curl --silent --fail http://127.0.0.1:8788/robots.txt > /dev/null; then
      return 0
    fi
    sleep 1
  done
  cat "$logfile"
  return 1
}

COMET_SITE_URL='' npm run build:browser
COMET_SITE_URL='' node apps/site/scripts/prepare-deployment.mjs preview "$comet_revision"
start_server preview
node apps/site/scripts/verify-deployment.mjs http://127.0.0.1:8788 preview "$comet_revision"
stop_server

# Reserved test origin exercises production SEO without claiming a deployment.
COMET_SITE_URL=https://comet.example npm run build:browser
COMET_SITE_URL=https://comet.example node apps/site/scripts/prepare-deployment.mjs production "$comet_revision"
start_server production
node --input-type=module -e "import { verifyDeployment } from './apps/site/scripts/verify-deployment.mjs'; await verifyDeployment('http://127.0.0.1:8788', 'production', process.argv[1], fetch, 'https://comet.example');" "$comet_revision"
