#!/usr/bin/env bash
# Instagram sync (cron of `deploy`, every 6 hours): POST /api/cron/instagram on the public site,
# authorised with CRON_SECRET from shared/.env. The secret is passed to curl on a file
# descriptor, so it never shows in the process list.
set -Eeuo pipefail

APP_ROOT=${APP_ROOT:-/var/www/zina}
ENV_FILE="$APP_ROOT/shared/.env"
get() { node "$APP_ROOT/current/deploy/scripts/env.cjs" "$1" "$ENV_FILE"; }

SITE=$(get NEXT_PUBLIC_SITE_URL)
SECRET=$(get CRON_SECRET)
printf '[instagram %s] ' "$(date -u +%FT%TZ)"
curl -sS -m 120 -X POST -H @<(printf 'Authorization: Bearer %s\n' "$SECRET") \
  -w ' (HTTP %{http_code})\n' "${SITE%/}/api/cron/instagram"
