/**
 * Instagram API with Instagram Login (graph.instagram.com), permission instagram_business_basic.
 * The account must be a Professional account (Business or Creator). See docs/instagram-setup.md.
 *
 *   GET  /{version}/me/media?fields=…          latest media of the token's account
 *   GET  /refresh_access_token?grant_type=ig_refresh_token&access_token=…
 *        refreshes a long-lived token (≥ 24 h old, not expired) for another 60 days
 */
export const INSTAGRAM_GRAPH = "https://graph.instagram.com";
export const INSTAGRAM_API_VERSION = "v26.0";

const FIELDS = ["id", "media_type", "media_url", "thumbnail_url", "permalink", "timestamp"];
// Meta documents `caption` and `like_count` for Instagram Login inconsistently; ask for them and
// fall back to the core fields if the API rejects one of them.
const OPTIONAL_FIELDS = ["caption", "like_count"];

export type InstagramMediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";

export type RawMedia = {
  id: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  caption?: string;
  like_count?: number;
};

/** A post we can show: it has an image (for videos, the poster frame) and a permalink. */
export type InstagramMedia = {
  id: string;
  mediaType: InstagramMediaType;
  caption: string | null;
  permalink: string;
  timestamp: Date;
  /** Image to download: media_url for images and albums, the thumbnail for videos */
  imageUrl: string;
  likeCount: number | null;
};

export class InstagramApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
  ) {
    super(message);
  }

  /** Expired or revoked token (OAuthException 190) */
  get isAuthError() {
    return this.code === 190 || this.status === 401;
  }
}

type Fetch = typeof fetch;

const MEDIA_TYPES: readonly string[] = ["IMAGE", "VIDEO", "CAROUSEL_ALBUM"];
const SAFE_URL = /^https:\/\//;

/** Normalises one API item, or null if it cannot be shown (no image, odd type, bad URL). */
export function mapMedia(raw: RawMedia): InstagramMedia | null {
  if (!raw.id || !MEDIA_TYPES.includes(raw.media_type ?? "")) return null;
  const mediaType = raw.media_type as InstagramMediaType;
  // Videos show their thumbnail; media_url is omitted for videos with licensed audio anyway.
  const imageUrl = mediaType === "VIDEO" ? raw.thumbnail_url : (raw.media_url ?? raw.thumbnail_url);
  const timestamp = raw.timestamp ? new Date(raw.timestamp) : null;
  if (!imageUrl || !SAFE_URL.test(imageUrl)) return null;
  if (!raw.permalink || !/^https:\/\/(www\.)?instagram\.com\//.test(raw.permalink)) return null;
  if (!timestamp || Number.isNaN(timestamp.getTime())) return null;

  return {
    id: raw.id,
    mediaType,
    caption: raw.caption?.trim() || null,
    permalink: raw.permalink,
    timestamp,
    imageUrl,
    likeCount: typeof raw.like_count === "number" ? raw.like_count : null,
  };
}

async function call<T>(url: URL, fetchImpl: Fetch): Promise<T> {
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: { message?: string; code?: number };
  } & T;
  if (!response.ok || body.error) {
    throw new InstagramApiError(
      body.error?.message ?? `Instagram API error (${response.status})`,
      response.status,
      body.error?.code,
    );
  }
  return body;
}

/** The latest `limit` posts of the account the token belongs to. */
export async function fetchRecentMedia(
  token: string,
  {
    userId,
    limit = 12,
    fetchImpl = fetch,
  }: { userId?: string; limit?: number; fetchImpl?: Fetch } = {},
): Promise<InstagramMedia[]> {
  const request = (fields: string[]) => {
    const url = new URL(`${INSTAGRAM_GRAPH}/${INSTAGRAM_API_VERSION}/${userId || "me"}/media`);
    url.searchParams.set("fields", fields.join(","));
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("access_token", token);
    return call<{ data?: RawMedia[] }>(url, fetchImpl);
  };

  let body: { data?: RawMedia[] };
  try {
    body = await request([...FIELDS, ...OPTIONAL_FIELDS]);
  } catch (error) {
    // Code 100: a requested field does not exist for this login type. Retry with core fields.
    if (error instanceof InstagramApiError && error.code === 100) body = await request(FIELDS);
    else throw error;
  }

  return (body.data ?? []).flatMap((raw) => mapMedia(raw) ?? []).slice(0, limit);
}

/** Exchanges a long-lived token for a fresh one (another 60 days). */
export async function refreshLongLivedToken(
  token: string,
  fetchImpl: Fetch = fetch,
): Promise<{ token: string; expiresAt: Date }> {
  const url = new URL(`${INSTAGRAM_GRAPH}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token);
  const body = await call<{ access_token?: string; expires_in?: number }>(url, fetchImpl);
  if (!body.access_token || !body.expires_in) {
    throw new InstagramApiError("Instagram returned no token", 502);
  }
  return {
    token: body.access_token,
    expiresAt: new Date(Date.now() + body.expires_in * 1000),
  };
}
