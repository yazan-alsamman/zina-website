#!/usr/bin/env bash
# Restores a backup made by backup.sh. Run as root (sudo), it needs the postgres superuser.
#
#   sudo restore.sh test  <db-…dump>               restore into a temporary database, compare
#                                                  row counts with the live one, drop it
#   sudo restore.sh live  <db-…dump> [uploads-…tar.gz]
#                                                  replace the live database (and media); the app
#                                                  is stopped meanwhile and a safety dump is taken
set -Eeuo pipefail

MODE=${1:?usage: restore.sh test|live <db-dump> [uploads-tar]}
DUMP=${2:?missing dump file}
UPLOADS=${3:-}
APP_ROOT=${APP_ROOT:-/var/www/zina}
[ -r "$DUMP" ] || { echo "Cannot read $DUMP" >&2; exit 1; }
pgq() { sudo -u postgres psql -X -qAt "$@"; }

counts() {
  pgq -d "$1" -c "SELECT string_agg(t || '=' || n, ' ' ORDER BY t) FROM (
    SELECT 'AdminUser' t, count(*) n FROM \"AdminUser\" UNION ALL
    SELECT 'Product', count(*) FROM \"Product\" UNION ALL
    SELECT 'Order', count(*) FROM \"Order\" UNION ALL
    SELECT 'MediaAsset', count(*) FROM \"MediaAsset\" UNION ALL
    SELECT '_prisma_migrations', count(*) FROM _prisma_migrations) s"
}

case "$MODE" in
  test)
    DB=zina_restore_test
    pgq -c "DROP DATABASE IF EXISTS $DB"
    pgq -c "CREATE DATABASE $DB OWNER zina"
    sudo -u postgres pg_restore --no-owner --role=zina -d "$DB" "$DUMP"
    echo "restored: $(counts $DB)"
    echo "live:     $(counts zina)"
    pgq -c "DROP DATABASE $DB"
    echo "Restore test passed; $DB dropped."
    ;;
  live)
    sudo -u deploy pm2 stop zina
    SAFETY="$APP_ROOT/shared/backups/before-restore-$(date -u +%Y%m%d-%H%M%S).dump"
    sudo -u postgres pg_dump --format=custom -d zina -f "$SAFETY"
    pgq -c "DROP DATABASE zina WITH (FORCE)"
    pgq -c "CREATE DATABASE zina OWNER zina"
    sudo -u postgres pg_restore --no-owner --role=zina -d zina "$DUMP"
    if [ -n "$UPLOADS" ]; then
      mv "$APP_ROOT/shared/storage/uploads" "$APP_ROOT/shared/storage/uploads.before-restore"
      tar -C "$APP_ROOT/shared/storage" -xzf "$UPLOADS"
      chown -R deploy:deploy "$APP_ROOT/shared/storage/uploads"
    fi
    sudo -u deploy pm2 start zina
    echo "Restored. Safety dump of the replaced database: $SAFETY"
    ;;
  *) echo "Unknown mode $MODE" >&2; exit 1 ;;
esac
