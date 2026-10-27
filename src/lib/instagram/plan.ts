import type { InstagramMedia } from "./api";

export type StoredPost = {
  id: string;
  isManual: boolean;
  removedAt: Date | null;
  timestamp: Date;
};

/**
 * What a sync changes. We only fetch the latest posts, so "missing from the response" means
 * "deleted on Instagram" only inside the window we fetched (posts at least as new as the oldest
 * one returned), or anywhere when the response was complete (fewer than the limit).
 * Manual posts are never touched.
 */
export function planSync(
  stored: readonly StoredPost[],
  fetched: readonly InstagramMedia[],
  { complete }: { complete: boolean },
) {
  const fetchedIds = new Set(fetched.map((media) => media.id));
  const storedById = new Map(stored.map((post) => [post.id, post]));
  const oldest = fetched.reduce<number | null>(
    (min, media) =>
      min === null ? media.timestamp.getTime() : Math.min(min, media.timestamp.getTime()),
    null,
  );

  return {
    create: fetched.filter((media) => !storedById.has(media.id)),
    update: fetched.filter((media) => storedById.has(media.id)),
    /** Back on Instagram after being marked removed (rare: archived and unarchived). */
    restore: fetched
      .filter((media) => storedById.get(media.id)?.removedAt)
      .map((media) => media.id),
    remove: stored
      .filter(
        (post) =>
          !post.isManual &&
          !post.removedAt &&
          !fetchedIds.has(post.id) &&
          (complete || (oldest !== null && post.timestamp.getTime() >= oldest)),
      )
      .map((post) => post.id),
  };
}
