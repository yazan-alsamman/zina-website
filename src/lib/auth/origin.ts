/**
 * CSRF guard for route handlers: state-changing requests must come from our own origin.
 * (Server actions get the same Origin-vs-Host check from Next.js itself.)
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
