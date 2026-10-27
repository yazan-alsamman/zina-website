import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for secrets stored in the database (the Instagram token). The key is derived from
 * INSTAGRAM_ENCRYPTION_KEY, or from AUTH_SECRET when that is not set, so a database dump alone
 * does not reveal them. Rotating the key makes stored secrets unreadable: callers then fall back
 * to the value in the environment.
 */
function key(): Buffer {
  const secret = process.env.INSTAGRAM_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("INSTAGRAM_ENCRYPTION_KEY or AUTH_SECRET must be set (32+ characters)");
  }
  return Buffer.from(hkdfSync("sha256", secret, "zina-al-mokri", "app-settings", 32));
}

export function seal(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), data]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
}

/** null if the value is malformed or was sealed with another key. */
export function open(sealed: string): string | null {
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(data, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
