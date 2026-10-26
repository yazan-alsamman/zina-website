/**
 * Fixed-window, in-memory login limiter that counts failed attempts only. Good enough for a
 * single Node process; move it to Redis or the database before running several instances (see
 * docs/deploy-notes.md).
 */
type Window = { count: number; resetAt: number };

const WINDOW_MS = 15 * 60 * 1000;
const PER_ACCOUNT = 5; // failures per IP + email
const PER_IP = 20; // failures per IP across all emails (credential stuffing)

const buckets = new Map<string, Window>();
const accountKey = (ip: string, email: string) => `acct:${ip}|${email.toLowerCase()}`;
const ipKey = (ip: string) => `ip:${ip}`;

function current(key: string, now: number): Window | null {
  const window = buckets.get(key);
  if (!window || window.resetAt <= now) return null;
  return window;
}

/** Is this IP + email (or this IP overall) over its failure budget? */
export function checkLoginRateLimit(ip: string, email: string, now = Date.now()) {
  const account = current(accountKey(ip, email), now);
  const network = current(ipKey(ip), now);
  const blockedAccount = (account?.count ?? 0) >= PER_ACCOUNT;
  const blockedNetwork = (network?.count ?? 0) >= PER_IP;
  return {
    allowed: !blockedAccount && !blockedNetwork,
    retryAfterMs: Math.max(
      blockedAccount ? account!.resetAt - now : 0,
      blockedNetwork ? network!.resetAt - now : 0,
    ),
  };
}

export function recordLoginFailure(ip: string, email: string, now = Date.now()) {
  if (buckets.size > 5_000) {
    for (const [key, value] of buckets) if (value.resetAt <= now) buckets.delete(key);
  }
  for (const key of [accountKey(ip, email), ipKey(ip)]) {
    const window = current(key, now);
    if (window) window.count += 1;
    else buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
  }
}

/** A successful login clears the per-account counter. */
export function resetLoginRateLimit(ip: string, email: string) {
  buckets.delete(accountKey(ip, email));
}
