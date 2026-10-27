# Deploy notes

## Environment

| Variable                        | Purpose                                                                                                                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                  | PostgreSQL connection string                                                                                                                                                                          |
| `NEXT_PUBLIC_SITE_URL`          | Public origin (`https://…`): canonical URLs, sitemap, OG images, tracking links in emails and WhatsApp messages. Set it before `npm run build`.                                                       |
| `AUTH_SECRET`                   | ≥ 32 random characters; signs admin session cookies (`openssl rand -base64 48`). Rotating it signs every admin out.                                                                                   |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First admin, created by `npm run db:seed` only when no admin exists. Remove `ADMIN_PASSWORD` from the server environment after the first seed.                                                        |
| `UPLOAD_DIR`                    | Where uploaded media is stored (default `./storage/uploads`). Must be on persistent storage and backed up.                                                                                            |
| `PUBLIC_MEDIA_URL`              | Base URL for media (default `/media`). Read at **build** time too (it is inlined), so set it before `npm run build`.                                                                                  |
| `BUSINESS_WHATSAPP`             | The house's WhatsApp number, digits only with country code (e.g. `971500000000`). Without it the WhatsApp buttons are hidden. Product pages are prerendered, so rebuild after changing it.            |
| `ORDER_NOTIFY_EMAIL`            | Where new-order notifications go (optional).                                                                                                                                                          |
| `SMTP_HOST`, `SMTP_PORT`        | SMTP server for order emails. Port 465 uses TLS, anything else STARTTLS. Without `SMTP_HOST`/`SMTP_FROM` emails are skipped and logged.                                                               |
| `SMTP_USER`, `SMTP_PASS`        | SMTP credentials (optional for unauthenticated relays).                                                                                                                                               |
| `SMTP_FROM`                     | Sender, e.g. `Zina Al Mokri <orders@example.com>`.                                                                                                                                                    |
| `INSTAGRAM_ACCESS_TOKEN`        | Long-lived Instagram token (see `docs/instagram-setup.md`). Only seeds the token store: the app refreshes it and keeps the current one encrypted in the database. Put a new value here to replace it. |
| `INSTAGRAM_USER_ID`             | Optional numeric Instagram account id (otherwise `me`).                                                                                                                                               |
| `CRON_SECRET`                   | ≥ 16 random characters (`openssl rand -hex 32`); authorises `POST /api/cron/instagram`.                                                                                                               |
| `SEED_SAMPLE_DATA`              | `"true"` seeds sample brands, products and orders. Never in production.                                                                                                                               |

## First deploy

```bash
npm ci
npx prisma migrate deploy
npm run db:seed          # creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD
npm run build
npm run start            # behind Nginx, on 127.0.0.1:3000
```

## Media (uploads)

Images are processed on upload (sharp) into `UPLOAD_DIR/<yyyy>/<mm>/<id>/`:
`original.<ext>` (metadata stripped) plus `w480/960/1600/2400` in AVIF and WebP. Logos live in
`UPLOAD_DIR/logos/`. File names never change, so they can be cached forever.

In development and simple setups the route handler `src/app/media/[...path]/route.ts` serves the
folder. In production let Nginx serve it directly (faster, and Node never touches static bytes):

```nginx
location /media/ {
    alias /srv/zina/storage/uploads/;          # = UPLOAD_DIR, trailing slash required
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header X-Content-Type-Options "nosniff";
    types { image/avif avif; image/webp webp; image/jpeg jpg jpeg; image/png png; image/svg+xml svg; }
    default_type application/octet-stream;
    autoindex off;
    location ~* \.svg$ {
        add_header Content-Security-Policy "default-src 'none'; style-src 'unsafe-inline'; sandbox";
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header X-Content-Type-Options "nosniff";
    }
}

# Uploads go through Next (auth + processing); allow 15 MB images.
location /admin/api/upload {
    client_max_body_size 16m;
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;      # used by the login rate limiter
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

`X-Real-IP` must be set by Nginx (and the app must not be reachable directly), otherwise a client
could spoof its IP to the login rate limiter.

## Admin security notes

- `/admin` is `noindex` (meta tag, `X-Robots-Tag` header) and disallowed in `robots.txt`.
- Session cookie: `zm_admin_session`, httpOnly, `Secure` in production, `SameSite=Lax`, path
  `/admin`, 7-day JWT (HS256). A password change or sign-out bumps the admin's session version,
  which revokes every outstanding token (a copied cookie stops working after sign-out).
- The login rate limiter is in memory (5 attempts per IP + email and 20 per IP per 15 minutes).
  It resets on restart and is per process; move it to Redis or Postgres before running several
  instances.
- Unattached uploads (images uploaded to a product form that was never saved) stay on disk.
  A cleanup job for `MediaAsset` rows without `ProductImage` older than a day is a later task.

## Storefront notes

- **Order numbers** come from the PostgreSQL sequence `order_number_seq` (created by the
  `storefront_checkout` migration). It is not in `schema.prisma`; restore it with the database.
- **Real 404s**: the proxy checks product slugs and order tracking tokens against the database
  before rendering (`src/lib/proxy-checks.ts`, its own pool of up to 3 connections). If the
  database is unreachable it lets the request through and the page decides.
- **Checkout rate limit** (5 new orders per IP per 10 minutes) is in memory, like the login
  limiter: move both to Redis or the database before running several instances. It relies on
  `X-Real-IP` from Nginx.
- **Emails** are sent after the response (`after()`), never blocking or failing an order. Check the
  logs for `[email]` lines.
- **OG image** fonts are read from `src/assets/fonts` relative to the working directory: start the
  app (`npm run start`) from the project root. Cormorant Garamond is under the SIL OFL
  (`src/assets/fonts/OFL.txt`).

## Instagram sync (cron)

`POST /api/cron/instagram` refreshes the Instagram token when due (after ~50 of its 60 days)
and mirrors the latest 12 posts (images downloaded into `UPLOAD_DIR`). Run it every 6 hours from
the server's crontab (`crontab -e` as the app user), reading the secret from the same `.env`:

```cron
0 */6 * * * . /srv/zina/.env && curl -fsS -m 120 -X POST -H "Authorization: Bearer $CRON_SECRET" https://YOUR-DOMAIN/api/cron/instagram > /dev/null
```

Adjust the path and domain. The endpoint answers 401 without the right bearer secret, 503 if
`CRON_SECRET` is unset, 200 when synced (or Instagram is not configured yet) and 502 on an API
error; details also appear on `/admin/instagram`. Without a token the site keeps showing the
manual posts and placeholders.
