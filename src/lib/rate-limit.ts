/**
 * Fixed-window, in-memory rate limiter for a single Node process (the storefront checkout).
 * Like the admin login limiter, move it to Redis or the database before running several
 * instances (see docs/deploy-notes.md).
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return {
    /** Counts one hit for `key`; `allowed` is false once the window's budget is spent. */
    hit(key: string, now = Date.now()) {
      if (windows.size > 5_000) {
        for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
      }
      let window = windows.get(key);
      if (!window || window.resetAt <= now) {
        window = { count: 0, resetAt: now + windowMs };
        windows.set(key, window);
      }
      window.count += 1;
      return { allowed: window.count <= limit, retryAfterMs: Math.max(0, window.resetAt - now) };
    },
  };
}
