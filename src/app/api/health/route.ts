import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Liveness for the deploy script and monitoring: `{ ok, db }`, 200 when the app can reach the
 * database, 503 otherwise. `release` names the running build (the release folder), so a deploy
 * can confirm the new code is live. Never reveals configuration or error details.
 */
export async function GET() {
  await connection();
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    // Reported as db: false; details stay in the server log.
  }
  return Response.json(
    { ok: db, db, release: process.env.RELEASE_ID ?? null },
    { status: db ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
