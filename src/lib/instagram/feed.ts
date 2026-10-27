import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { INSTAGRAM_TAG } from "../cache-tags";
import { prisma } from "../prisma";
import type { SmartAsset } from "../shop/types";

export type FeedPost = {
  id: string;
  caption: string | null;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  permalink: string;
  /** ISO timestamp */
  timestamp: string;
  asset: SmartAsset;
};

/**
 * Visible posts, newest first, with their locally stored images. Cached; the sync, the cron
 * route and the admin actions invalidate INSTAGRAM_TAG. An empty list (or a database error)
 * means the sections fall back to their placeholders.
 */
export async function getInstagramFeed(limit = 24): Promise<FeedPost[]> {
  "use cache";
  cacheTag(INSTAGRAM_TAG);
  cacheLife("hours");

  try {
    const rows = await prisma.instagramPost.findMany({
      where: { isHidden: false, asset: { isNot: null } },
      orderBy: { timestamp: "desc" },
      take: limit,
      include: { asset: true },
    });
    return rows.flatMap((row) =>
      row.asset
        ? [
            {
              id: row.id,
              caption: row.caption,
              mediaType: row.mediaType,
              permalink: row.permalink,
              timestamp: row.timestamp.toISOString(),
              asset: {
                dir: row.asset.dir,
                widths: row.asset.widths,
                width: row.asset.width,
                height: row.asset.height,
                lqip: row.asset.lqip,
              },
            },
          ]
        : [],
    );
  } catch (error) {
    console.warn("[instagram] feed unavailable:", (error as Error).message);
    return [];
  }
}
