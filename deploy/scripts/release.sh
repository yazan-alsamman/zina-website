#!/usr/bin/env bash
# Activates an uploaded release. Runs on the server as `deploy` (called by the GitHub Actions
# deploy workflow after rsync, or by hand):
#
#   /var/www/zina/releases/<name>/deploy/scripts/release.sh <name>
#
# 1. links shared/.env and the uploads into the release
# 2. applies database migrations (prisma migrate deploy)
# 3. starts the release on the standby port (3001) and health-checks it; on failure the live
#    site is untouched and the release is discarded
# 4. switches `current` atomically and restarts the app (3000); Nginx sends traffic to the
#    standby meanwhile (upstream backup), so visitors see no downtime
# 5. health-checks the app; on failure switches back to the previous release (rollback)
# 6. expires the data caches, stops the standby, saves the PM2 list, keeps the last 5 releases
#
# SIMULATE_HEALTH_FAILURE=1 makes step 5 fail on purpose, to test the rollback.
set -Eeuo pipefail

APP_ROOT=${APP_ROOT:-/var/www/zina}
KEEP_RELEASES=${KEEP_RELEASES:-5}
SIMULATE_HEALTH_FAILURE=${SIMULATE_HEALTH_FAILURE:-0}
NAME=${1:?usage: release.sh <release-name>}
NEW="$APP_ROOT/releases/$NAME"
SHARED="$APP_ROOT/shared"
CURRENT="$APP_ROOT/current"
export APP_ROOT

log() { printf '[release %s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
fail() { log "FAILED: $*"; exit 1; }
env_get() { node "$NEW/deploy/scripts/env.cjs" "$1" "$SHARED/.env"; }

[ -f "$NEW/server.js" ] || fail "$NEW is not a release (no server.js)"
[ -f "$SHARED/.env" ] || fail "$SHARED/.env is missing"
PREVIOUS=$(readlink -f "$CURRENT" 2>/dev/null || true)
[ "$PREVIOUS" = "$NEW" ] && fail "$NAME is already the current release"

# Waits for /api/health on a port to report ok, from the expected release.
healthy() {
  local port=$1 body
  for _ in $(seq 1 40); do
    body=$(curl -fsS --max-time 4 "http://127.0.0.1:$port/api/health" 2>/dev/null || true)
    if [[ $body == *'"ok":true'* && $body == *"\"release\":\"$2\""* ]]; then
      return 0
    fi
    sleep 1
  done
  log "health check on :$port did not pass (last answer: ${body:-none})"
  return 1
}

start_app() { # name release-dir
  pm2 delete "$1" >/dev/null 2>&1 || true
  RELEASE_DIR="$2" pm2 start "$2/ecosystem.config.cjs" --only "$1" --update-env >/dev/null
}

discard() {
  pm2 delete zina-standby >/dev/null 2>&1 || true
  mv "$NEW" "$APP_ROOT/releases/failed-$NAME" 2>/dev/null || true
}

# 1. Shared files -----------------------------------------------------------------------------
log "release $NAME (previous: ${PREVIOUS:+$(basename "$PREVIOUS")}${PREVIOUS:-none})"
ln -sfn "$SHARED/.env" "$NEW/.env"
mkdir -p "$NEW/storage"
ln -sfn "$SHARED/storage/uploads" "$NEW/storage/uploads"
# Static chunks accumulate in one folder that Nginx serves, so pages still open in a browser keep
# loading the chunks of the release they were rendered with.
mkdir -p "$SHARED/assets/_next/static"
cp -a --link -n "$NEW/.next/static/." "$SHARED/assets/_next/static/" 2>/dev/null ||
  cp -a -n "$NEW/.next/static/." "$SHARED/assets/_next/static/"

# 2. Migrations -------------------------------------------------------------------------------
log "applying migrations"
DATABASE_URL=$(env_get DATABASE_URL) || fail "DATABASE_URL is not set in shared/.env"
(cd "$NEW/migrate" && DATABASE_URL="$DATABASE_URL" ./node_modules/.bin/prisma migrate deploy) ||
  { discard; fail "migrate deploy"; }
unset DATABASE_URL

# 3. Standby ----------------------------------------------------------------------------------
log "starting the new release on the standby port"
start_app zina-standby "$NEW"
healthy 3001 "$NAME" || { discard; fail "the new release is not healthy; the site was not touched"; }

# 4. Switch -----------------------------------------------------------------------------------
log "switching current -> $NAME"
ln -sfn "$NEW" "$APP_ROOT/.current.tmp"
mv -Tf "$APP_ROOT/.current.tmp" "$CURRENT"
start_app zina "$NEW"

# 5. Verify, or roll back ---------------------------------------------------------------------
if [ "$SIMULATE_HEALTH_FAILURE" = "1" ] || ! healthy 3000 "$NAME"; then
  [ "$SIMULATE_HEALTH_FAILURE" = "1" ] && log "simulated health check failure"
  if [ -n "$PREVIOUS" ] && [ -d "$PREVIOUS" ]; then
    log "rolling back to $(basename "$PREVIOUS")"
    ln -sfn "$PREVIOUS" "$APP_ROOT/.current.tmp"
    mv -Tf "$APP_ROOT/.current.tmp" "$CURRENT"
    start_app zina "$PREVIOUS"
    healthy 3000 "$(basename "$PREVIOUS")" || log "WARNING: the previous release is not healthy either"
    pm2 save >/dev/null
  fi
  discard
  fail "health check after the switch; rolled back"
fi

# 6. Finish -----------------------------------------------------------------------------------
CRON_SECRET=$(env_get CRON_SECRET) || CRON_SECRET=""
if [ -n "$CRON_SECRET" ]; then
  # The header comes from a file descriptor so the secret never appears in the process list.
  curl -fsS --max-time 10 -X POST -H @<(printf 'Authorization: Bearer %s\n' "$CRON_SECRET") \
    http://127.0.0.1:3000/api/cron/revalidate >/dev/null || log "WARNING: cache revalidation failed"
fi
unset CRON_SECRET
pm2 delete zina-standby >/dev/null 2>&1 || true
pm2 save >/dev/null

# Keep the newest releases (names start with a UTC timestamp; never the current one), and failed
# ones for a day.
cd "$APP_ROOT/releases"
ls -1d -- */ 2>/dev/null | sed 's#/$##' | grep -v '^failed-' | sort -r | tail -n +$((KEEP_RELEASES + 1)) |
  while read -r old; do
    if [ "$APP_ROOT/releases/$old" != "$NEW" ]; then rm -rf -- "$old"; fi
  done
find "$APP_ROOT/releases" -maxdepth 1 -name 'failed-*' -mtime +0 -exec rm -rf -- {} + 2>/dev/null || true

log "done: $NAME is live"
