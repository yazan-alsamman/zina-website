import { jwtVerify, SignJWT } from "jose";

/**
 * Admin session token: an HS256 JWT in an httpOnly cookie. This module has no Node-only or
 * database imports so the proxy can verify signatures cheaply; the full check (admin still
 * exists, session version matches) happens in src/lib/auth/session.ts.
 */
export const SESSION_COOKIE = "zm_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const ISSUER = "zina-al-mokri";
const AUDIENCE = "admin";

export type SessionClaims = { sub: string; ver: number };

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ver: claims.ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof payload.sub !== "string" || typeof payload.ver !== "number") return null;
    return { sub: payload.sub, ver: payload.ver };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/admin",
    maxAge,
  };
}
