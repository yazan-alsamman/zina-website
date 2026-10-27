const DAY = 86_400_000;

/** Long-lived Instagram tokens last 60 days; we refresh well before that. */
export const TOKEN_LIFETIME_DAYS = 60;
export const REFRESH_AFTER_DAYS = 50;
/** Instagram refuses to refresh a token younger than 24 hours. */
export const MIN_AGE_HOURS = 24;

export type RefreshDecision =
  | { action: "refresh"; reason: string }
  | { action: "wait"; reason: string }
  | { action: "expired"; reason: string };

/**
 * When to refresh the long-lived token.
 * - `issuedAt`: when we last obtained or refreshed it (null if unknown, e.g. just pasted).
 * - `expiresAt`: expiry reported by Instagram (null if unknown).
 */
export function refreshDecision(
  { issuedAt, expiresAt }: { issuedAt: Date | null; expiresAt: Date | null },
  now = new Date(),
): RefreshDecision {
  const t = now.getTime();
  if (expiresAt && expiresAt.getTime() <= t) {
    return { action: "expired", reason: "The token has expired: generate a new one." };
  }
  if (!issuedAt) {
    // Unknown age (a token just pasted into the environment): refreshing learns its expiry.
    return { action: "refresh", reason: "Token age unknown." };
  }
  const ageMs = t - issuedAt.getTime();
  if (ageMs < MIN_AGE_HOURS * 3_600_000) {
    return { action: "wait", reason: "Instagram only refreshes tokens older than 24 hours." };
  }
  if (ageMs >= REFRESH_AFTER_DAYS * DAY) {
    return { action: "refresh", reason: `Token is older than ${REFRESH_AFTER_DAYS} days.` };
  }
  if (expiresAt && expiresAt.getTime() - t <= (TOKEN_LIFETIME_DAYS - REFRESH_AFTER_DAYS) * DAY) {
    return { action: "refresh", reason: "Token expires within 10 days." };
  }
  return { action: "wait", reason: "Token is still fresh." };
}
