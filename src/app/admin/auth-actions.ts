"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  type ActionState,
  fieldErrors,
  loginSchema,
  passwordChangeSchema,
} from "@/lib/admin/schemas";
import { decoyHash, hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  checkLoginRateLimit,
  recordLoginFailure,
  resetLoginRateLimit,
} from "@/lib/auth/rate-limit";
import { endSession, getAdminSession, requireAdmin, startSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const GENERIC_LOGIN_ERROR = "Invalid email or password.";

async function clientIp() {
  const h = await headers();
  // Behind Nginx, X-Real-IP is set by our own proxy (see docs/deploy-notes.md).
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/** Only same-site admin paths are allowed as post-login destinations. */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/admin") && !next.startsWith("//") && !next.includes("\\")
    ? next
    : "/admin";
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fieldErrors(parsed.error, formData);
  const { email, password } = parsed.data;

  const ip = await clientIp();
  const limit = checkLoginRateLimit(ip, email);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterMs / 60_000));
    return {
      ok: false,
      message: `Too many attempts. Try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
      values: { email },
    };
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  // Verify against a decoy hash for unknown emails so timing does not reveal valid accounts.
  const valid = admin
    ? await verifyPassword(admin.passwordHash, password)
    : (await verifyPassword(await decoyHash(), password), false);

  if (!admin || !valid) {
    recordLoginFailure(ip, email);
    return { ok: false, message: GENERIC_LOGIN_ERROR, values: { email } };
  }

  resetLoginRateLimit(ip, email);
  await startSession(admin);
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction() {
  const session = await getAdminSession();
  if (session) {
    // Revoke the token server-side too, so a copied cookie stops working after sign-out.
    // (This signs the admin out on every device, which suits a single-owner atelier.)
    await prisma.adminUser.update({
      where: { id: session.id },
      data: { sessionVersion: { increment: 1 } },
    });
  }
  await endSession();
  redirect("/admin/login");
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = passwordChangeSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const admin = await prisma.adminUser.findUniqueOrThrow({ where: { id: session.id } });
  if (!(await verifyPassword(admin.passwordHash, parsed.data.current))) {
    return { ok: false, errors: { current: ["That is not your current password"] } };
  }

  const updated = await prisma.adminUser.update({
    where: { id: admin.id },
    data: {
      passwordHash: await hashPassword(parsed.data.next),
      // Revokes every other session; this browser gets a fresh token below.
      sessionVersion: { increment: 1 },
    },
  });
  await startSession(updated);
  return { ok: true, message: "Password changed. Other signed-in devices have been signed out." };
}
