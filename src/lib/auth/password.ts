import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id (the library default) with OWASP-recommended parameters: 19 MiB memory, 2 passes,
 * 1 lane. Hashes are self-describing PHC strings, so parameters can be raised later without
 * invalidating stored hashes.
 */
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// A real hash of a random string, verified when the email is unknown so that response time
// does not reveal which admin emails exist.
let decoy: Promise<string> | null = null;
export function decoyHash(): Promise<string> {
  decoy ??= hashPassword(crypto.randomUUID());
  return decoy;
}
