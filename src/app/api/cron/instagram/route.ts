import { revalidateTag } from "next/cache";
import { INSTAGRAM_TAG } from "@/lib/cache-tags";
import { isAuthorizedCron } from "@/lib/instagram/cron-auth";
import { syncInstagram } from "@/lib/instagram/sync";

/**
 * Called by a server cron every 6 hours (docs/deploy-notes.md):
 *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/instagram
 * Refreshes the Instagram token when due and syncs the latest posts.
 */
export async function POST(request: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json({ ok: false, error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const status = await syncInstagram();
  // Pages showing the feed regenerate on their next visit.
  revalidateTag(INSTAGRAM_TAG, "max");
  return Response.json(status, {
    status: status.ok || status.state === "not_configured" ? 200 : 502,
  });
}
