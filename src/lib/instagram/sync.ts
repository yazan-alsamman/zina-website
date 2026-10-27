import "server-only";
import { processImage } from "../media/process";
import { MAX_UPLOAD_BYTES, validateImageUpload } from "../media/validate";
import { prisma } from "../prisma";
import { fetchRecentMedia, InstagramApiError, refreshLongLivedToken } from "./api";
import { planSync } from "./plan";
import { currentToken, saveRefreshedToken, saveSyncStatus, type SyncStatus } from "./settings";
import { refreshDecision } from "./token-policy";

export const SYNC_LIMIT = 12;

type Fetch = typeof fetch;

/**
 * Mirrors the latest posts of @zina.almokri: refreshes the long-lived token when due, fetches
 * the latest 12 posts, downloads new images (video posters) into our own media store, updates
 * captions and likes, and hides posts deleted on Instagram. Never throws: the outcome is
 * returned and stored for the admin page. Callers invalidate the INSTAGRAM_TAG cache.
 */
export async function syncInstagram(fetchImpl: Fetch = fetch): Promise<SyncStatus> {
  const status = await run(fetchImpl);
  await saveSyncStatus(status).catch((error) =>
    console.error("[instagram] could not store sync status:", error),
  );
  if (!status.ok) console.warn(`[instagram] ${status.state}: ${status.message}`);
  return status;
}

async function run(fetchImpl: Fetch): Promise<SyncStatus> {
  const at = new Date().toISOString();
  const token = await currentToken();
  if (!token) {
    return {
      at,
      ok: false,
      state: "not_configured",
      message:
        "Instagram is not connected yet: set INSTAGRAM_ACCESS_TOKEN (see docs/instagram-setup.md). Manual posts are shown meanwhile.",
    };
  }

  let accessToken = token.token;
  let tokenRefreshed = false;
  const decision = refreshDecision(token);
  if (decision.action === "expired") {
    return { at, ok: false, state: "error", message: decision.reason };
  }
  if (decision.action === "refresh") {
    try {
      const fresh = await refreshLongLivedToken(accessToken, fetchImpl);
      await saveRefreshedToken(fresh.token, fresh.expiresAt);
      accessToken = fresh.token;
      tokenRefreshed = true;
    } catch (error) {
      if (error instanceof InstagramApiError && error.isAuthError) {
        return {
          at,
          ok: false,
          state: "error",
          message: `The Instagram token was rejected (${error.message}). Generate a new one.`,
        };
      }
      // e.g. a token younger than 24 hours: keep using it and try again on the next run.
      console.warn("[instagram] token refresh skipped:", (error as Error).message);
    }
  }

  let media;
  try {
    media = await fetchRecentMedia(accessToken, {
      userId: process.env.INSTAGRAM_USER_ID?.trim() || undefined,
      limit: SYNC_LIMIT,
      fetchImpl,
    });
  } catch (error) {
    return { at, ok: false, state: "error", message: (error as Error).message, tokenRefreshed };
  }

  const stored = await prisma.instagramPost.findMany({
    where: { isManual: false },
    select: { id: true, isManual: true, removedAt: true, timestamp: true },
  });
  const plan = planSync(stored, media, { complete: media.length < SYNC_LIMIT });
  const failures: string[] = [];
  const now = new Date();

  let created = 0;
  for (const item of plan.create) {
    try {
      const asset = await downloadImage(item.imageUrl, fetchImpl);
      await prisma.instagramPost.create({
        data: {
          id: item.id,
          caption: item.caption,
          mediaType: item.mediaType,
          permalink: item.permalink,
          timestamp: item.timestamp,
          localImagePath: asset.dir,
          localVideoPosterPath: item.mediaType === "VIDEO" ? asset.dir : null,
          width: asset.width,
          height: asset.height,
          likeCount: item.likeCount,
          assetId: asset.id,
          fetchedAt: now,
        },
      });
      created += 1;
    } catch (error) {
      failures.push(`${item.id}: ${(error as Error).message}`);
    }
  }

  const restore = new Set(plan.restore);
  for (const item of plan.update) {
    await prisma.instagramPost.update({
      where: { id: item.id },
      data: {
        caption: item.caption,
        likeCount: item.likeCount,
        permalink: item.permalink,
        fetchedAt: now,
        ...(restore.has(item.id) ? { removedAt: null, isHidden: false } : {}),
      },
    });
  }

  if (plan.remove.length > 0) {
    await prisma.instagramPost.updateMany({
      where: { id: { in: plan.remove } },
      data: { isHidden: true, removedAt: now },
    });
  }

  return {
    at,
    ok: failures.length === 0,
    state: failures.length === 0 ? "synced" : "error",
    message:
      failures.length === 0
        ? `Synced ${media.length} posts.`
        : `Synced with ${failures.length} image download error(s): ${failures.join("; ")}`,
    fetched: media.length,
    created,
    updated: plan.update.length,
    removed: plan.remove.length,
    tokenRefreshed,
  };
}

/** Downloads an Instagram CDN image into our media store (CDN URLs expire; never hotlink). */
async function downloadImage(url: string, fetchImpl: Fetch) {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
  if (!response.ok) throw new Error(`image download failed (${response.status})`);
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES) throw new Error("image too large");
  const bytes = new Uint8Array(await response.arrayBuffer());
  const check = validateImageUpload(bytes, bytes.byteLength);
  if (!check.ok) throw new Error(check.error);
  const processed = await processImage(Buffer.from(bytes), check.type);
  return prisma.mediaAsset.create({ data: processed });
}
