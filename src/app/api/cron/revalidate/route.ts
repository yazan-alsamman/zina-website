import { revalidateTag } from "next/cache";
import { BRANDS_TAG, INSTAGRAM_TAG, PRODUCTS_TAG } from "@/lib/cache-tags";
import { isAuthorizedCron } from "@/lib/instagram/cron-auth";

/**
 * Called by deploy/scripts/release.sh once a new release is live. The bundle is built on CI
 * against an empty database, so pages prerendered at build time hold no catalogue: expiring the
 * data tags makes the next visit render them from the production database.
 */
export async function POST(request: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json({ ok: false, error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const tags = [PRODUCTS_TAG, BRANDS_TAG, INSTAGRAM_TAG];
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ ok: true, tags });
}
