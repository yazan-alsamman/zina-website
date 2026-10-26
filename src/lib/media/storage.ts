import path from "node:path";

/** Absolute upload root. Defaults to ./storage/uploads (git-ignored). */
export function uploadRoot(): string {
  // Runtime data location, not code: keep the bundler from tracing it.
  return path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.UPLOAD_DIR || "storage/uploads",
  );
}

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Maps URL segments to a file inside the upload root, or null. Every segment must be a plain
 * name (no "..", separators, NUL or leading dots) and the resolved path must stay inside the
 * root, so /media can never read outside UPLOAD_DIR.
 */
export function resolveMediaPath(segments: readonly string[]): string | null {
  if (segments.length === 0 || segments.length > 6) return null;
  if (!segments.every((segment) => SAFE_SEGMENT.test(segment) && !segment.includes(".."))) {
    return null;
  }
  const root = uploadRoot();
  const full = path.resolve(/*turbopackIgnore: true*/ root, ...segments);
  return full.startsWith(root + path.sep) ? full : null;
}

export const MEDIA_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
