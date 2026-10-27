# Connecting @zina.almokri to the site

The site reads Zina's latest posts with Meta's **Instagram API with Instagram Login** (the old
Basic Display API was shut down). It only needs read access to her own account
(`instagram_business_basic`). Until it is connected the site shows the posts added by hand in
**Admin → Instagram**, then curated placeholders.

Checked against Meta's developer documentation in October 2026. Meta renames menus often: if a
label differs slightly, look for the closest match.

## 1. Make the account a Professional account

The API only works for Professional accounts (Creator or Business). Switching is free and
reversible, and does not change followers or posts.

1. In the Instagram app, open Zina's profile and tap the menu (☰).
2. Go to **Account type and tools** → **Switch to professional account**.
3. Pick a category (e.g. _Beauty, cosmetic & personal care_ or _Digital creator_), then choose
   **Creator** or **Business**. Either works for this site.
4. Keep the account **public**: Meta requires a public account to generate tokens.

## 2. Create the Meta app

1. Sign in at <https://developers.facebook.com> with a Facebook account (register as a
   developer if asked) and open **My Apps** (<https://developers.facebook.com/apps>).
2. Click **Create App**. For the use case choose **Other**, for the app type choose **Business**
   (required for the Instagram product). Name it e.g. "Zina Al Mokri website" and add a contact
   email.
3. On the app dashboard, find the **Instagram** product and click **Set up**. This adds
   **API setup with Instagram login** (not "with Facebook login").

## 3. Add Zina's account and generate the token

1. In **Instagram → API setup with Instagram login**, under **Generate access tokens**, click
   **Add account** and log in to Instagram as @zina.almokri. (Accounts can also be managed in
   **App roles → Roles**.)
2. Next to the account, click **Generate token** and approve the permissions.
3. Copy the token. Tokens generated here are **long-lived (60 days)**. The site refreshes it
   automatically every ~50 days, so this is a one-time step unless it is allowed to expire.

Meta's guide notes that App Review is required before an app can access live data. Reading the
app's own account in development mode is normally enough for this site; if the sync reports
that the API refused access, submit `instagram_business_basic` for App Review from the app
dashboard (**App Review → Permissions and features**) and describe the use: "Show our own latest
posts on our website."

## 4. Put the token on the server

Add to the production `.env` (never commit it):

```bash
INSTAGRAM_ACCESS_TOKEN="IGAA…"   # the token from step 3
INSTAGRAM_USER_ID=""             # optional; the API's "me" is used otherwise
CRON_SECRET="…"                  # if not set yet: openssl rand -hex 32
```

Restart the app, open **Admin → Instagram** and click **Sync now**. The status panel shows the
last sync, the token expiry and any error. From then on the server cron (see
`docs/deploy-notes.md`) syncs every 6 hours and refreshes the token when it is due.

To replace the token later (for example after it expired), generate a new one as in step 3, put
it in `INSTAGRAM_ACCESS_TOKEN` and restart: a token different from the stored one takes over.

## What the sync does

- Fetches the 12 latest posts (`GET graph.instagram.com/v26.0/me/media`).
- Downloads each new image (for videos, the poster frame) into our own media store and
  serves it from this site: Instagram's image links expire and are never hotlinked.
- Updates captions and like counts, and hides posts that were deleted on Instagram.
- Hidden posts (by the sync or by hand in the admin) never show on the site.
