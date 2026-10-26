# Deploy notes

## Environment

| Variable                        | Purpose                                                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                  | PostgreSQL connection string                                                                                                                   |
| `NEXT_PUBLIC_SITE_URL`          | Public origin, used for metadata                                                                                                               |
| `AUTH_SECRET`                   | ≥ 32 random characters; signs admin session cookies (`openssl rand -base64 48`). Rotating it signs every admin out.                            |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First admin, created by `npm run db:seed` only when no admin exists. Remove `ADMIN_PASSWORD` from the server environment after the first seed. |
| `UPLOAD_DIR`                    | Where uploaded media is stored (default `./storage/uploads`). Must be on persistent storage and backed up.                                     |
| `PUBLIC_MEDIA_URL`              | Base URL for media (default `/media`). Read at **build** time too (it is inlined), so set it before `npm run build`.                           |
| `SEED_SAMPLE_DATA`              | `"true"` seeds sample brands, products and orders. Never in production.                                                                        |

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
