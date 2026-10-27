#!/usr/bin/env bash
# Nightly backup (cron of `deploy`, 03:00 UTC): the database (pg_dump, custom format) and the
# uploaded media, into shared/backups. Keeps 14 days.
#
#   /var/www/zina/current/deploy/scripts/backup.sh
#
# The database password comes from ~/.pgpass (written by server-bootstrap.sh), never argv.
set -Eeuo pipefail
umask 077

APP_ROOT=${APP_ROOT:-/var/www/zina}
DIR="$APP_ROOT/shared/backups"
KEEP_DAYS=${KEEP_DAYS:-14}
STAMP=$(date -u +%Y%m%d-%H%M%S)
mkdir -p "$DIR"

pg_dump --format=custom --no-owner --no-privileges -h 127.0.0.1 -U zina -d zina \
  -f "$DIR/db-$STAMP.dump.part"
mv "$DIR/db-$STAMP.dump.part" "$DIR/db-$STAMP.dump"

tar -C "$APP_ROOT/shared/storage" -czf "$DIR/uploads-$STAMP.tar.gz.part" uploads
mv "$DIR/uploads-$STAMP.tar.gz.part" "$DIR/uploads-$STAMP.tar.gz"

find "$DIR" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' -o -name '*.part' \) \
  -mtime +$((KEEP_DAYS - 1)) -delete

printf '[backup %s] db-%s.dump (%s), uploads-%s.tar.gz (%s)\n' "$(date -u +%FT%TZ)" \
  "$STAMP" "$(du -h "$DIR/db-$STAMP.dump" | cut -f1)" \
  "$STAMP" "$(du -h "$DIR/uploads-$STAMP.tar.gz" | cut -f1)"
