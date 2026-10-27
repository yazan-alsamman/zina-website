import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Cron endpoints accept `Authorization: Bearer <CRON_SECRET>`. Compared in constant time (both
 * sides hashed, so lengths never leak). Without a configured secret (or one shorter than 16
 * characters) nothing is accepted.
 */
export function isAuthorizedCron(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !header) return false;
  // The auth scheme is case-insensitive (RFC 7235).
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return false;
  const a = createHash("sha256").update(match[1]).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}
