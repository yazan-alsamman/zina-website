import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "../prisma";
import { open, seal } from "../secret-box";

const KEYS = {
  token: "instagram.token", // sealed
  tokenSource: "instagram.tokenSource", // sha256 of the env token it came from
  issuedAt: "instagram.tokenIssuedAt",
  expiresAt: "instagram.tokenExpiresAt",
  lastSync: "instagram.lastSync", // JSON SyncStatus
} as const;

export type SyncStatus = {
  at: string;
  ok: boolean;
  /** "not_configured" | "synced" | "error" */
  state: string;
  message: string;
  fetched?: number;
  created?: number;
  updated?: number;
  removed?: number;
  tokenRefreshed?: boolean;
};

export type TokenState = {
  token: string;
  issuedAt: Date | null;
  expiresAt: Date | null;
  /** "stored" (refreshed by us) or "env" (INSTAGRAM_ACCESS_TOKEN as given) */
  source: "stored" | "env";
};

async function read(keys: string[]) {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: keys } } });
  return new Map(rows.map((row) => [row.key, row.value]));
}

async function write(values: Record<string, string>) {
  await prisma.$transaction(
    Object.entries(values).map(([key, value]) =>
      prisma.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } }),
    ),
  );
}

const fingerprint = (token: string) => createHash("sha256").update(token).digest("hex");
const date = (value: string | undefined) => (value ? new Date(value) : null);

/**
 * The token to use. INSTAGRAM_ACCESS_TOKEN only seeds the store: once refreshed, the stored
 * (encrypted) token wins, until a different token is put in the environment.
 */
export async function currentToken(): Promise<TokenState | null> {
  const envToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || null;
  const settings = await read([KEYS.token, KEYS.tokenSource, KEYS.issuedAt, KEYS.expiresAt]);
  const stored = settings.get(KEYS.token);
  const storedToken = stored ? open(stored) : null;
  const sameSeed = envToken !== null && settings.get(KEYS.tokenSource) === fingerprint(envToken);

  if (storedToken && (envToken === null || sameSeed)) {
    return {
      token: storedToken,
      issuedAt: date(settings.get(KEYS.issuedAt)),
      expiresAt: date(settings.get(KEYS.expiresAt)),
      source: "stored",
    };
  }
  if (!envToken) return null;
  // A new token in the environment (or nothing stored yet): its age and expiry are unknown.
  return {
    token: envToken,
    issuedAt: sameSeed ? date(settings.get(KEYS.issuedAt)) : null,
    expiresAt: sameSeed ? date(settings.get(KEYS.expiresAt)) : null,
    source: "env",
  };
}

export async function saveRefreshedToken(token: string, expiresAt: Date) {
  const envToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  await write({
    [KEYS.token]: seal(token),
    [KEYS.tokenSource]: envToken ? fingerprint(envToken) : "",
    [KEYS.issuedAt]: new Date().toISOString(),
    [KEYS.expiresAt]: expiresAt.toISOString(),
  });
}

export async function saveSyncStatus(status: SyncStatus) {
  await write({ [KEYS.lastSync]: JSON.stringify(status) });
}

export async function readStatus(now = new Date()): Promise<{
  lastSync: SyncStatus | null;
  token: (Omit<TokenState, "token"> & { daysLeft: number | null }) | null;
}> {
  const settings = await read([KEYS.lastSync]);
  const raw = settings.get(KEYS.lastSync);
  let lastSync: SyncStatus | null = null;
  try {
    lastSync = raw ? (JSON.parse(raw) as SyncStatus) : null;
  } catch {
    lastSync = null;
  }
  const token = await currentToken();
  return {
    lastSync,
    token: token
      ? {
          issuedAt: token.issuedAt,
          expiresAt: token.expiresAt,
          source: token.source,
          daysLeft: token.expiresAt
            ? Math.floor((token.expiresAt.getTime() - now.getTime()) / 86_400_000)
            : null,
        }
      : null,
  };
}
