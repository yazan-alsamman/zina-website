import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 32 random bytes as base64url (43 characters): the secret in a customer's tracking link. */
export function createPublicToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Constant-time comparison. Both sides are hashed first so inputs of different lengths still
 * compare in constant time (timingSafeEqual needs equal-length buffers).
 */
export function tokensMatch(expected: string, provided: string | null | undefined): boolean {
  if (typeof provided !== "string" || provided.length === 0 || provided.length > 128) return false;
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(provided).digest();
  return timingSafeEqual(a, b);
}
