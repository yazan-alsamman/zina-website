// Creates the first admin on the server from ADMIN_EMAIL / ADMIN_PASSWORD in shared/.env, only
// when no admin exists yet (same rules as `npm run db:seed`, without any sample data).
//
//   cd /var/www/zina/current && node deploy/scripts/create-admin.mjs
//
// Uses the release's own dependencies (pg, @node-rs/argon2) and the app's password parameters
// (src/lib/auth/password.ts). Never prints the password.
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { hash } from "@node-rs/argon2";
import pg from "pg";

const require = createRequire(import.meta.url);
const { readEnv } = require("./env.cjs");

const env = readEnv(`${process.env.APP_ROOT || "/var/www/zina"}/shared/.env`);
const email = env.ADMIN_EMAIL?.trim().toLowerCase();
const password = env.ADMIN_PASSWORD;
const name = env.ADMIN_NAME?.trim() || "Zina";

if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not set in shared/.env");
const client = new pg.Client({ connectionString: env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query('SELECT count(*)::int AS n FROM "AdminUser"');
  if (rows[0].n > 0) {
    console.log("An admin already exists: nothing to do.");
  } else if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in shared/.env first.");
    process.exitCode = 1;
  } else if (password.length < 12) {
    console.error("ADMIN_PASSWORD must be at least 12 characters.");
    process.exitCode = 1;
  } else {
    const passwordHash = await hash(password, {
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
      outputLen: 32,
    });
    // Same shape as Prisma's cuid() ids: "c" + 24 lowercase base-36 characters.
    const id = `c${BigInt(`0x${randomBytes(16).toString("hex")}`)
      .toString(36)
      .padStart(24, "0")
      .slice(0, 24)}`;
    await client.query(
      'INSERT INTO "AdminUser" (id, email, "passwordHash", name) VALUES ($1, $2, $3, $4)',
      [id, email, passwordHash, name],
    );
    console.log(`Created admin ${email}. You can now remove ADMIN_PASSWORD from shared/.env.`);
  }
} finally {
  await client.end();
}
