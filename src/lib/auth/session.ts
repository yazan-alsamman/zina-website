import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifySessionToken } from "./token";

export type AdminSession = { id: string; email: string; name: string };

export async function startSession(admin: { id: string; sessionVersion: number }) {
  const token = await signSession({ sub: admin.id, ver: admin.sessionVersion });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function endSession() {
  (await cookies()).set(SESSION_COOKIE, "", sessionCookieOptions(0));
}

/**
 * Full session check: valid signature and expiry, the admin still exists, and the token was
 * issued for the current session version (a password change revokes older sessions).
 * Cached per request.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const claims = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  const admin = await prisma.adminUser.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, name: true, sessionVersion: true },
  });
  if (!admin || admin.sessionVersion !== claims.ver) return null;
  return { id: admin.id, email: admin.email, name: admin.name };
});

/**
 * Guard for every admin page, server action and route handler. Server actions are public
 * endpoints, so each one calls this itself instead of relying on the proxy.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
