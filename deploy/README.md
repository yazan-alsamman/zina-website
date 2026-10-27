# Deploying Zina Al Mokri

Production runs on one Ubuntu 24.04 VPS: Nginx (TLS, static files, media) in front of the
Next.js standalone server under PM2, with PostgreSQL 16 on localhost. GitHub Actions builds every
push to `main` and releases it with no downtime and automatic rollback.

```
/var/www/zina/
├── current -> releases/20261027120000-abc1234     (atomic symlink)
├── releases/                                      (last 5 kept)
└── shared/
    ├── .env              production environment (deploy, 600), secrets generated on the server
    ├── storage/uploads/  uploaded media (UPLOAD_DIR), served by Nginx at /media/
    ├── assets/_next/static/  build chunks of every release (Nginx), so open tabs survive a deploy
    ├── logs/             PM2 app logs, cron logs
    └── backups/          nightly database dump + media archive, 14 days
```

## Files

| File                                        | Runs                        | Does                                                                               |
| ------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------- |
| `scripts/server-bootstrap.sh`               | once, as root, step by step | users, SSH hardening, firewall, packages, database, `.env`, PM2 boot, cron, Nginx  |
| `scripts/bundle.sh`                         | CI                          | assembles the release from `next build` (standalone, static, public, migrations)   |
| `scripts/release.sh`                        | server, per deploy          | migrate, standby health check, switch, restart, health check, rollback, prune      |
| `scripts/backup.sh`                         | cron 03:00 UTC              | `pg_dump` (custom format) + uploads archive, keeps 14 days                         |
| `scripts/restore.sh`                        | by hand, root               | `test` (restore into a temporary database) or `live` restore                       |
| `scripts/instagram-sync.sh`                 | cron every 6 h              | `POST /api/cron/instagram` with `CRON_SECRET`                                      |
| `scripts/create-admin.mjs`                  | once                        | first admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `shared/.env`, no sample data |
| `nginx/zinaalmokri.conf`                    | Nginx site                  | HTTPS, HTTP/2, headers, CSP, static + media from disk, proxy with standby backup   |
| `nginx/zinaalmokri-redirects.conf`          | Nginx site (final switch)   | `www.` and `new.` → apex                                                           |
| `nginx/zina-*.conf`                         | Nginx snippets / conf.d     | security headers, proxy settings, gzip, brotli                                     |
| `../ecosystem.config.cjs`                   | PM2                         | `zina` on 127.0.0.1:3000 (fork, 1 instance), `zina-standby` on :3001 for deploys   |
| `../.github/workflows/ci.yml`, `deploy.yml` | GitHub Actions              | checks on every PR/push; build + release after CI passes on `main`                 |

## How a deploy works

1. CI (`ci.yml`) passes on `main`: lint, typecheck, tests, build against a throwaway Postgres.
2. `deploy.yml` builds again from that commit with the production build variables
   (`SITE_URL`, `BUSINESS_WHATSAPP`), assembles the bundle and uploads it with rsync to
   `releases/<UTC timestamp>-<sha>`; unchanged files are hard-linked from the live release.
3. `release.sh` on the server: links `shared/.env` and the uploads, runs `prisma migrate deploy`,
   starts the new release on the standby port and waits for `/api/health`. If it is not healthy
   the live site was never touched and the release is discarded.
4. It switches `current` atomically and restarts `zina`; while it restarts, Nginx sends requests
   to the standby (upstream `backup`). It then checks `/api/health` on :3000 and, if that fails,
   points `current` back to the previous release and restarts it (rollback).
5. It expires the data caches (the build ran against an empty database), stops the standby,
   saves the PM2 process list and keeps the last 5 releases.

Two deploys never overlap (`concurrency: deploy-production`). Migrations run before the switch,
so they must stay compatible with the previous release (add columns, don't rename in one step).

## Operating

Connect: `ssh -i ~/.ssh/zina_deploy deploy@<server>` for the app; `ssh -i ~/.ssh/zina_yazan
yazan@<server>` for administration (`sudo` asks for yazan's password). Root and password logins
are off; Hostinger's browser console is the emergency way in.

| Task                | How                                                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deploy              | push to `main`; or GitHub → Actions → Deploy → Run workflow                                                                                                                   |
| Test the rollback   | Actions → Deploy → Run workflow with "simulate health failure" (the run ends red, the site stays up)                                                                          |
| Roll back by hand   | `cd /var/www/zina && ls releases` then `ln -sfn releases/<name> .c && mv -Tf .c current && pm2 delete zina && pm2 start current/ecosystem.config.cjs --only zina && pm2 save` |
| App status / logs   | `pm2 ls`, `pm2 logs zina --lines 100`, files in `shared/logs/`                                                                                                                |
| Nginx logs          | `/var/log/nginx/zina.access.log`, `zina.error.log` (rotated daily by logrotate)                                                                                               |
| Health              | `curl -s https://<domain>/api/health` → `{"ok":true,"db":true,"release":"…"}`                                                                                                 |
| Edit production env | `ssh -t deploy@<server> nano /var/www/zina/shared/.env`, then `pm2 delete zina && pm2 start /var/www/zina/current/ecosystem.config.cjs --only zina && pm2 save`               |
| Backups             | `ls /var/www/zina/shared/backups`; run now: `/var/www/zina/current/deploy/scripts/backup.sh`                                                                                  |
| Test a backup       | as root: `restore.sh test /var/www/zina/shared/backups/db-<stamp>.dump`                                                                                                       |
| Restore a backup    | as root: `restore.sh live <db dump> [<uploads archive>]` (stops the app, keeps a safety dump)                                                                                 |

Build-time values: `NEXT_PUBLIC_SITE_URL`, `BUSINESS_WHATSAPP` and `PUBLIC_MEDIA_URL` are inlined
when the bundle is built, so they are GitHub repository variables (`SITE_URL`,
`BUSINESS_WHATSAPP`) as well as lines in `shared/.env`. Change both, then redeploy.

## First-time setup (summary)

Done once over SSH, in order (each step of `server-bootstrap.sh` is idempotent):

1. `users`: the `deploy` user (sudo only for `systemctl reload nginx` and `nginx -t`) with two
   new ed25519 keys in `/root/zina-keys/deploy/` (one for people, one for GitHub Actions), and the
   admin user `yazan` (full sudo with a password) with its own key in `/root/zina-keys/admin/`.
   Then `passwd yazan`, typed on the server.
2. `harden`: once key logins for `deploy` and `yazan` (plus `sudo`) work in new sessions: no
   passwords, no root login, `AllowUsers deploy yazan`. It refuses to run before that.
3. `base`: ufw (SSH, 80, 443), fail2ban for sshd, unattended upgrades, UTC, 2 GB swap if
   RAM < 4 GB.
4. `packages`: Node.js 24 (NodeSource), PM2, PostgreSQL 16 (localhost only), Nginx (+ brotli),
   certbot with the nginx plugin.
5. `app <site-url> <whatsapp>`: database and role with a password generated on the server,
   folders, `shared/.env` (generated `AUTH_SECRET`, `CRON_SECRET`, `INSTAGRAM_ENCRYPTION_KEY`),
   `~deploy/.pgpass`, PM2 on boot + pm2-logrotate, cron (Instagram every 6 h, backup 03:00 UTC).
6. Fill in `ADMIN_EMAIL`, `ADMIN_PASSWORD` and SMTP in `shared/.env` yourself
   (`ssh -t … nano …`), never through chat or CI.
7. DNS `A new → <server IP>`, then `nginx new.zinaalmokri.com`: certificate + site.
8. GitHub secrets `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`;
   variables `SITE_URL`, `BUSINESS_WHATSAPP` (until `SSH_HOST` exists, Deploy ends green with a
   "Deploy skipped" notice); first deploy; then
   `node deploy/scripts/create-admin.mjs` in `current`.

### Final switch to zinaalmokri.com

1. DNS: `A @ → <server IP>`, `A www → <server IP>` (or `CNAME www → zinaalmokri.com`); remove
   the old site's records.
2. `certbot certonly --nginx -d zinaalmokri.com -d www.zinaalmokri.com -d new.zinaalmokri.com`
3. Install `nginx/zinaalmokri.conf` with `__DOMAIN__=zinaalmokri.com` and
   `nginx/zinaalmokri-redirects.conf` with `__APEX__=zinaalmokri.com`; `nginx -t`, reload.
4. `SITE_URL` variable and `NEXT_PUBLIC_SITE_URL` in `shared/.env` → `https://zinaalmokri.com`;
   redeploy.
