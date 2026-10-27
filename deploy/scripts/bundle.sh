#!/usr/bin/env bash
# Assembles the deployable release from a finished `next build` (output: "standalone").
# Runs on the CI runner (Linux x64, like the server), never on the VPS.
#
#   deploy/scripts/bundle.sh [out-dir]      default: release/
#
# Layout of the bundle (= one folder in /var/www/zina/releases/):
#   server.js, .next/, node_modules/   Next.js standalone server (traced dependencies only)
#   .next/static/, public/             static files (Nginx serves them directly as well)
#   migrate/                           Prisma CLI, schema and migrations for `migrate deploy`
#   deploy/scripts/, ecosystem.config.cjs
set -euo pipefail

OUT=${1:-release}
cd "$(dirname "$0")/../.."
[ -f .next/standalone/server.js ] || { echo "Run next build first (output: standalone)." >&2; exit 1; }

rm -rf "$OUT"
mkdir -p "$OUT/.next" "$OUT/migrate" "$OUT/deploy"
cp -a .next/standalone/. "$OUT/"
# Never ship a build machine's env file.
rm -f "$OUT"/.env "$OUT"/.env.*
cp -a .next/static "$OUT/.next/static"
cp -a public "$OUT/public"

# Migrations run with the same Prisma version as the app, installed apart from the server bundle.
cp -a prisma/migrations prisma/schema.prisma "$OUT/migrate/"
cat > "$OUT/migrate/prisma.config.mjs" <<'CONFIG'
// Production migrations only (release.sh passes DATABASE_URL in the environment).
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "schema.prisma",
  migrations: { path: "migrations" },
  datasource: { url: process.env.DATABASE_URL },
});
CONFIG
PRISMA_VERSION=$(node -p 'require("./node_modules/prisma/package.json").version')
(
  cd "$OUT/migrate"
  echo '{ "name": "zina-migrate", "private": true, "type": "module" }' > package.json
  npm install --no-audit --no-fund --loglevel=error --save-exact "prisma@$PRISMA_VERSION"
)

cp -a deploy/scripts "$OUT/deploy/scripts"
cp ecosystem.config.cjs "$OUT/"
git rev-parse HEAD > "$OUT/REVISION" 2>/dev/null || true

du -sh "$OUT" | awk '{print "Bundle: " $1}'
