#!/usr/bin/env bash
# One-time server setup for Ubuntu 24.04, run as root, one step at a time (deploy/README.md).
# Every step is idempotent and never prints a secret: secrets are generated here, on the server,
# and written only to /var/www/zina/shared/.env (deploy, 600) and ~deploy/.pgpass.
#
#   server-bootstrap.sh users      deploy user (limited sudo, keys from /root/zina-keys/deploy/*.pub)
#                                  and the admin user (full sudo with a password, keys from
#                                  /root/zina-keys/admin/*.pub); then set it: passwd <admin user>
#   server-bootstrap.sh harden     key-only SSH, no root login (verify both key logins first!)
#   server-bootstrap.sh base       ufw, fail2ban, unattended-upgrades, UTC, swap if RAM < 4 GB
#   server-bootstrap.sh packages   Node.js 24 (NodeSource), PM2, PostgreSQL 16, Nginx, certbot
#   server-bootstrap.sh app <site-url> <whatsapp>
#                                  database + role, folders, shared/.env, PM2 on boot, cron
#   server-bootstrap.sh nginx <domain> [<email>]
#                                  certificate (certbot, nginx plugin) and the site config
set -Eeuo pipefail

APP_ROOT=/var/www/zina
SHARED=$APP_ROOT/shared
DEPLOY=deploy
ADMIN_USER=${ADMIN_USER:-yazan} # people: key login, sudo asks for this user's password
SRC=$(cd "$(dirname "$0")/../.." && pwd) # the repository or release folder holding deploy/

log() { printf '\n== %s\n' "$*"; }
[ "$(id -u)" = 0 ] || { echo "Run as root." >&2; exit 1; }
export DEBIAN_FRONTEND=noninteractive

# authorize <user> <dir>: append every public key in <dir> to the user's authorized_keys.
authorize() {
  local user=$1 dir=$2 home
  home=$(getent passwd "$user" | cut -d: -f6)
  install -d -m 700 -o "$user" -g "$user" "$home/.ssh"
  touch "$home/.ssh/authorized_keys"
  for key in "$dir"/*.pub; do
    [ -f "$key" ] || continue
    grep -qxF "$(cat "$key")" "$home/.ssh/authorized_keys" || cat "$key" >> "$home/.ssh/authorized_keys"
  done
  chown "$user:$user" "$home/.ssh/authorized_keys"
  chmod 600 "$home/.ssh/authorized_keys"
  echo "authorized keys for $user: $(grep -c . "$home/.ssh/authorized_keys")"
}

has_password() { [ "$(passwd -S "$1" | awk '{print $2}')" = P ]; }

step_users() {
  log "deploy user"
  id "$DEPLOY" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$DEPLOY"
  authorize "$DEPLOY" /root/zina-keys/deploy
  # Only what deploys need; PM2 runs as deploy itself.
  cat > /etc/sudoers.d/zina-deploy <<EOF
$DEPLOY ALL=(root) NOPASSWD: /usr/bin/systemctl reload nginx, /usr/sbin/nginx -t
EOF
  chmod 440 /etc/sudoers.d/zina-deploy
  visudo -cf /etc/sudoers.d/zina-deploy

  log "admin user $ADMIN_USER"
  id "$ADMIN_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$ADMIN_USER"
  usermod -aG sudo "$ADMIN_USER" # Ubuntu's sudo group: full sudo, password required
  authorize "$ADMIN_USER" /root/zina-keys/admin
  has_password "$ADMIN_USER" || echo "No password yet. Set the sudo password yourself: passwd $ADMIN_USER"
}

step_harden() {
  log "SSH: keys only, no root login"
  # Never lock the door before both ways in work: keys for both users, a sudo password for admin.
  local user
  for user in "$DEPLOY" "$ADMIN_USER"; do
    grep -q . "$(getent passwd "$user" | cut -d: -f6)/.ssh/authorized_keys" 2>/dev/null ||
      { echo "No SSH key for $user: run the users step first." >&2; exit 1; }
  done
  has_password "$ADMIN_USER" ||
    { echo "$ADMIN_USER has no password, so sudo would not work: passwd $ADMIN_USER" >&2; exit 1; }
  local allow="AllowUsers $DEPLOY $ADMIN_USER"
  cat > /etc/ssh/sshd_config.d/00-zina-hardening.conf <<EOF
# Zina Al Mokri: read before the other drop-ins, so these values win.
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
PermitEmptyPasswords no
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
$allow
EOF
  sshd -t
  systemctl reload ssh
  sshd -T | grep -Ei '^(port|passwordauthentication|permitrootlogin|pubkeyauthentication|allowusers) '
}

step_base() {
  log "updates, firewall, fail2ban, unattended upgrades, time zone"
  apt-get update -q
  apt-get -y -q upgrade
  apt-get install -y -q ufw fail2ban unattended-upgrades curl ca-certificates gnupg rsync
  timedatectl set-timezone UTC

  local port
  port=$(sshd -T | awk '$1 == "port" {print $2; exit}')
  ufw default deny incoming
  ufw default allow outgoing
  if [ "$port" = 22 ]; then ufw allow OpenSSH; else ufw allow "$port/tcp"; fi
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
  ufw status verbose

  cat > /etc/fail2ban/jail.d/zina-sshd.local <<EOF
[sshd]
enabled = true
backend = systemd
port = $port
maxretry = 5
findtime = 10m
bantime = 1h
EOF
  systemctl enable --now fail2ban
  systemctl restart fail2ban

  cat > /etc/apt/apt.conf.d/20auto-upgrades <<EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
  systemctl enable --now unattended-upgrades

  local ram_mb
  ram_mb=$(awk '/MemTotal/ {print int($2 / 1024)}' /proc/meminfo)
  if [ "$ram_mb" -lt 4000 ] && ! swapon --show | grep -q .; then
    log "swap: 2 GB (RAM ${ram_mb} MB)"
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo 'vm.swappiness=10' > /etc/sysctl.d/90-zina-swap.conf
    sysctl -p /etc/sysctl.d/90-zina-swap.conf
  fi
}

step_packages() {
  log "Node.js 24 (NodeSource)"
  install -d -m 755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key |
    gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update -q
  apt-get install -y -q nodejs postgresql-16 postgresql-client-16 nginx certbot python3-certbot-nginx
  # Brotli is optional (universe); gzip alone if it is not available.
  apt-get install -y -q libnginx-mod-http-brotli-filter libnginx-mod-http-brotli-static || true

  log "PM2"
  npm install -g --no-fund --no-audit pm2@6
  log "versions"
  node -v; npm -v; pm2 -v; psql --version; nginx -v 2>&1; certbot --version
}

step_app() {
  local site_url=${1:?site url, e.g. https://new.zinaalmokri.com} whatsapp=${2:?whatsapp number}

  log "folders"
  install -d -o "$DEPLOY" -g "$DEPLOY" -m 755 $APP_ROOT $APP_ROOT/releases $SHARED \
    $SHARED/storage $SHARED/storage/uploads $SHARED/logs $SHARED/assets
  install -d -o "$DEPLOY" -g "$DEPLOY" -m 700 $SHARED/backups
  install -d -m 755 /var/www/letsencrypt

  log "PostgreSQL: localhost only, database and role zina"
  local conf
  conf=$(sudo -u postgres psql -XqAt -c 'SHOW config_file')
  grep -Eq "^\s*listen_addresses\s*=\s*'localhost'" "$conf" ||
    sed -i "s/^#\?\s*listen_addresses\s*=.*/listen_addresses = 'localhost'/" "$conf"
  systemctl restart postgresql

  if [ ! -f $SHARED/.env ]; then
    local db_pass auth_secret cron_secret ig_key
    db_pass=$(openssl rand -hex 32)
    auth_secret=$(openssl rand -base64 48 | tr -d '\n')
    cron_secret=$(openssl rand -hex 32)
    ig_key=$(openssl rand -hex 32)
    # SQL on stdin: the password never appears in a process list.
    sudo -u postgres psql -Xq -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'zina') THEN CREATE ROLE zina LOGIN; END IF;
END \$\$;
ALTER ROLE zina WITH LOGIN PASSWORD '$db_pass';
SQL
    sudo -u postgres psql -XqAt -c "SELECT 1 FROM pg_database WHERE datname = 'zina'" | grep -q 1 ||
      sudo -u postgres createdb -O zina zina

    umask 077
    cat > $SHARED/.env <<EOF
# Production environment (server-only, never committed). Owner deploy, mode 600.
DATABASE_URL="postgresql://zina:$db_pass@127.0.0.1:5432/zina?schema=public"
NEXT_PUBLIC_SITE_URL="$site_url"
AUTH_SECRET="$auth_secret"
CRON_SECRET="$cron_secret"
INSTAGRAM_ENCRYPTION_KEY="$ig_key"
UPLOAD_DIR="$SHARED/storage/uploads"
PUBLIC_MEDIA_URL="/media"
BUSINESS_WHATSAPP="$whatsapp"

# First admin: created by deploy/scripts/create-admin.mjs, then remove ADMIN_PASSWORD.
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
ADMIN_NAME="Zina"

# Order emails (optional)
ORDER_NOTIFY_EMAIL=""
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""

# Instagram (docs/instagram-setup.md)
INSTAGRAM_ACCESS_TOKEN=""
INSTAGRAM_USER_ID=""
EOF
    chown "$DEPLOY:$DEPLOY" $SHARED/.env
    chmod 600 $SHARED/.env
    printf '127.0.0.1:5432:zina:zina:%s\n' "$db_pass" > /home/$DEPLOY/.pgpass
    chown "$DEPLOY:$DEPLOY" /home/$DEPLOY/.pgpass
    chmod 600 /home/$DEPLOY/.pgpass
    umask 022
    echo "shared/.env written (secrets generated on this server)."
  else
    echo "shared/.env exists: left untouched."
  fi

  log "PM2 on boot, log rotation"
  env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$DEPLOY" --hp /home/$DEPLOY >/dev/null
  sudo -iu "$DEPLOY" bash -c '
    pm2 ls >/dev/null
    pm2 describe pm2-logrotate >/dev/null 2>&1 || pm2 install pm2-logrotate >/dev/null
    pm2 set pm2-logrotate:max_size 20M >/dev/null
    pm2 set pm2-logrotate:retain 14 >/dev/null
    pm2 set pm2-logrotate:compress true >/dev/null
    pm2 save >/dev/null'

  log "cron for deploy (UTC)"
  sudo -iu "$DEPLOY" bash -c "crontab - <<'CRON'
# Zina Al Mokri (deploy/README.md). Server time is UTC.
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
0 */6 * * * $APP_ROOT/current/deploy/scripts/instagram-sync.sh >> $SHARED/logs/instagram-cron.log 2>&1
0 3 * * * $APP_ROOT/current/deploy/scripts/backup.sh >> $SHARED/logs/backup.log 2>&1
CRON
crontab -l"

  # Logs written by cron and the backup script
  cat > /etc/logrotate.d/zina <<EOF
$SHARED/logs/instagram-cron.log $SHARED/logs/backup.log {
    weekly
    rotate 8
    compress
    missingok
    notifempty
    su $DEPLOY $DEPLOY
}
EOF
}

step_nginx() {
  local domain=${1:?domain, e.g. new.zinaalmokri.com} email=${2:-}
  log "Nginx for $domain"
  install -m 644 "$SRC/deploy/nginx/zina-headers.conf" /etc/nginx/snippets/zina-headers.conf
  install -m 644 "$SRC/deploy/nginx/zina-proxy.conf" /etc/nginx/snippets/zina-proxy.conf
  install -m 644 "$SRC/deploy/nginx/zina-compression.conf" /etc/nginx/conf.d/zina-compression.conf
  # Ubuntu's nginx.conf already turns gzip on at http level; ours sets the details.
  sed -i 's/^\(\s*\)gzip on;/\1# gzip on; (see conf.d\/zina-compression.conf)/' /etc/nginx/nginx.conf
  if ls /etc/nginx/modules-enabled/ 2>/dev/null | grep -q brotli; then
    install -m 644 "$SRC/deploy/nginx/zina-brotli.conf" /etc/nginx/conf.d/zina-brotli.conf
  fi
  sed -i 's/^\(\s*\)# server_tokens off;/\1server_tokens off;/' /etc/nginx/nginx.conf

  if [ ! -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
    log "certificate for $domain (certbot, nginx plugin)"
    # A plain HTTP block for the domain first, so the plugin finds where to answer the challenge.
    cat > /etc/nginx/sites-available/zinaalmokri.conf <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $domain;
    location ^~ /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 404; }
}
EOF
    ln -sfn /etc/nginx/sites-available/zinaalmokri.conf /etc/nginx/sites-enabled/zinaalmokri.conf
    nginx -t
    systemctl reload nginx
    local account=(--register-unsafely-without-email)
    [ -n "$email" ] && account=(--email "$email")
    certbot certonly --nginx --non-interactive --agree-tos "${account[@]}" -d "$domain"
  fi
  # options-ssl-nginx.conf and dhparams come with the nginx plugin.
  [ -f /etc/letsencrypt/ssl-dhparams.pem ] || openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
  install -d /etc/letsencrypt/renewal-hooks/deploy
  printf '#!/bin/sh\nsystemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx
  chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx

  sed "s/__DOMAIN__/$domain/g" "$SRC/deploy/nginx/zinaalmokri.conf" \
    > /etc/nginx/sites-available/zinaalmokri.conf
  ln -sfn /etc/nginx/sites-available/zinaalmokri.conf /etc/nginx/sites-enabled/zinaalmokri.conf
  nginx -t
  systemctl reload nginx
  echo "Nginx serves https://$domain"
}

case "${1:-}" in
  users) step_users ;;
  harden) step_harden ;;
  base) step_base ;;
  packages) step_packages ;;
  app) shift; step_app "$@" ;;
  nginx) shift; step_nginx "$@" ;;
  *) sed -n '2,15p' "$0"; exit 1 ;;
esac
