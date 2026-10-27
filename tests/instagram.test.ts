import { describe, expect, it, vi } from "vitest";
import {
  fetchRecentMedia,
  mapMedia,
  refreshLongLivedToken,
  type RawMedia,
} from "@/lib/instagram/api";
import { isAuthorizedCron } from "@/lib/instagram/cron-auth";
import { planSync } from "@/lib/instagram/plan";
import { refreshDecision } from "@/lib/instagram/token-policy";
import { open, seal } from "@/lib/secret-box";

/** Shaped like a real GET /me/media response (fields abbreviated). */
const apiResponse: { data: RawMedia[] } = {
  data: [
    {
      id: "17900000000000001",
      media_type: "IMAGE",
      media_url: "https://scontent.cdninstagram.com/v/t51/one.jpg?oe=ABC",
      permalink: "https://www.instagram.com/p/AAA111/",
      timestamp: "2026-10-20T18:05:00+0000",
      caption: "First impressions: the new satin lipstick.\nMore in stories.",
      like_count: 412,
    },
    {
      id: "17900000000000002",
      media_type: "VIDEO",
      media_url: "https://scontent.cdninstagram.com/v/t50/clip.mp4",
      thumbnail_url: "https://scontent.cdninstagram.com/v/t51/clip-thumb.jpg",
      permalink: "https://www.instagram.com/reel/BBB222/",
      timestamp: "2026-10-18T09:00:00+0000",
    },
    {
      // Video with licensed audio: no media_url, but a thumbnail
      id: "17900000000000003",
      media_type: "VIDEO",
      thumbnail_url: "https://scontent.cdninstagram.com/v/t51/licensed-thumb.jpg",
      permalink: "https://www.instagram.com/reel/CCC333/",
      timestamp: "2026-10-16T09:00:00+0000",
    },
    {
      id: "17900000000000004",
      media_type: "CAROUSEL_ALBUM",
      media_url: "https://scontent.cdninstagram.com/v/t51/album-cover.jpg",
      permalink: "https://www.instagram.com/p/DDD444/",
      timestamp: "2026-10-12T09:00:00+0000",
    },
    // Unusable: no image at all, and a non-Instagram permalink
    {
      id: "17900000000000005",
      media_type: "VIDEO",
      permalink: "https://www.instagram.com/reel/E/",
      timestamp: "2026-10-10T09:00:00+0000",
    },
    {
      id: "17900000000000006",
      media_type: "IMAGE",
      media_url: "https://x.example/a.jpg",
      permalink: "https://evil.example/p/F/",
      timestamp: "2026-10-09T09:00:00+0000",
    },
  ],
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("Instagram API mapping", () => {
  it("maps images, videos (poster from the thumbnail) and albums, and skips unusable items", () => {
    const mapped = apiResponse.data.map(mapMedia).filter(Boolean);
    expect(
      mapped.map((m) => [m!.id.slice(-1), m!.mediaType, m!.imageUrl.split("/").pop()]),
    ).toEqual([
      ["1", "IMAGE", "one.jpg?oe=ABC"],
      ["2", "VIDEO", "clip-thumb.jpg"],
      ["3", "VIDEO", "licensed-thumb.jpg"],
      ["4", "CAROUSEL_ALBUM", "album-cover.jpg"],
    ]);
    expect(mapped[0]).toMatchObject({
      caption: "First impressions: the new satin lipstick.\nMore in stories.",
      likeCount: 412,
      timestamp: new Date("2026-10-20T18:05:00Z"),
    });
    expect(mapped[1]).toMatchObject({ caption: null, likeCount: null });
  });

  it("requests the latest 12 posts and retries without optional fields if they are refused", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { message: "Tried accessing nonexisting field (caption)", code: 100 } },
          400,
        ),
      )
      .mockResolvedValueOnce(jsonResponse(apiResponse));
    const media = await fetchRecentMedia("TOKEN", { fetchImpl });

    expect(media).toHaveLength(4);
    const first = new URL(String(fetchImpl.mock.calls[0][0]));
    const second = new URL(String(fetchImpl.mock.calls[1][0]));
    expect(first.origin + first.pathname).toBe("https://graph.instagram.com/v26.0/me/media");
    expect(first.searchParams.get("limit")).toBe("12");
    expect(first.searchParams.get("fields")).toContain("caption");
    expect(second.searchParams.get("fields")).not.toContain("caption");
  });

  it("surfaces token errors and parses refreshed tokens", async () => {
    const expired = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse({ error: { message: "Session has expired", code: 190 } }, 400),
      );
    await expect(fetchRecentMedia("OLD", { fetchImpl: expired })).rejects.toMatchObject({
      isAuthError: true,
    });

    const refresh = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse({ access_token: "NEW", token_type: "bearer", expires_in: 5183944 }),
      );
    const fresh = await refreshLongLivedToken("OLD", refresh);
    const url = new URL(String(refresh.mock.calls[0][0]));
    expect(url.pathname).toBe("/refresh_access_token");
    expect(url.searchParams.get("grant_type")).toBe("ig_refresh_token");
    expect(fresh.token).toBe("NEW");
    expect(fresh.expiresAt.getTime() - Date.now()).toBeGreaterThan(59 * 86_400_000);
  });
});

describe("sync plan", () => {
  const mapped = apiResponse.data.map(mapMedia).flatMap((m) => (m ? [m] : []));
  const stored = (
    id: string,
    iso: string,
    extra: Partial<{ isManual: boolean; removedAt: Date }> = {},
  ) => ({
    id,
    timestamp: new Date(iso),
    isManual: false,
    removedAt: null,
    ...extra,
  });

  it("creates new posts, updates known ones and hides deleted ones inside the fetched window", () => {
    const plan = planSync(
      [
        stored("17900000000000001", "2026-10-20T18:05:00Z"),
        stored("deleted-recent", "2026-10-15T00:00:00Z"), // inside the window, gone: removed
        stored("older-than-window", "2026-09-01T00:00:00Z"), // outside: untouched
        stored("manual_x", "2026-10-19T00:00:00Z", { isManual: true }), // never touched
      ],
      mapped,
      { complete: false },
    );
    expect(plan.create.map((m) => m.id.slice(-1))).toEqual(["2", "3", "4"]);
    expect(plan.update.map((m) => m.id.slice(-1))).toEqual(["1"]);
    expect(plan.remove).toEqual(["deleted-recent"]);
  });

  it("treats every missing post as removed when the response was complete, and restores returns", () => {
    const plan = planSync(
      [
        stored("older-than-window", "2026-09-01T00:00:00Z"),
        stored("17900000000000004", "2026-10-12T09:00:00Z", { removedAt: new Date() }),
      ],
      mapped,
      { complete: true },
    );
    expect(plan.remove).toEqual(["older-than-window"]);
    expect(plan.restore).toEqual(["17900000000000004"]);
  });
});

describe("token refresh decision", () => {
  const now = new Date("2026-10-27T12:00:00Z");
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
  const inDays = (d: number) => new Date(now.getTime() + d * 86_400_000);

  it("refreshes after 50 days, close to expiry, or when the age is unknown", () => {
    expect(refreshDecision({ issuedAt: daysAgo(51), expiresAt: inDays(9) }, now).action).toBe(
      "refresh",
    );
    expect(refreshDecision({ issuedAt: daysAgo(10), expiresAt: inDays(5) }, now).action).toBe(
      "refresh",
    );
    expect(refreshDecision({ issuedAt: null, expiresAt: null }, now).action).toBe("refresh");
  });

  it("waits while fresh or younger than 24 hours, and reports expiry", () => {
    expect(refreshDecision({ issuedAt: daysAgo(20), expiresAt: inDays(40) }, now).action).toBe(
      "wait",
    );
    expect(refreshDecision({ issuedAt: daysAgo(0.5), expiresAt: null }, now).action).toBe("wait");
    expect(refreshDecision({ issuedAt: daysAgo(61), expiresAt: daysAgo(1) }, now).action).toBe(
      "expired",
    );
  });
});

describe("cron authentication", () => {
  const secret = "s3cret-value-long-enough-for-cron";

  it("accepts only the exact bearer secret", () => {
    expect(isAuthorizedCron(`Bearer ${secret}`, secret)).toBe(true);
    expect(isAuthorizedCron(`bearer   ${secret}`, secret)).toBe(true);
    expect(isAuthorizedCron(`Bearer ${secret}x`, secret)).toBe(false);
    expect(isAuthorizedCron(secret, secret)).toBe(false); // no scheme
    expect(isAuthorizedCron(null, secret)).toBe(false);
  });

  it("rejects everything when the secret is missing or too short", () => {
    expect(isAuthorizedCron("Bearer anything", undefined)).toBe(false);
    expect(isAuthorizedCron("Bearer short", "short")).toBe(false);
  });
});

describe("stored token encryption", () => {
  it("round-trips and refuses tampering or another key", () => {
    process.env.AUTH_SECRET = "a".repeat(48);
    const sealed = seal("IGAA-token");
    expect(sealed).not.toContain("IGAA");
    expect(open(sealed)).toBe("IGAA-token");
    const parts = sealed.split(".");
    parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith("A") ? "BB" : "AA");
    expect(open(parts.join("."))).toBeNull();
    process.env.AUTH_SECRET = "b".repeat(48);
    expect(open(sealed)).toBeNull();
  });

  it("prefers INSTAGRAM_ENCRYPTION_KEY over AUTH_SECRET", () => {
    process.env.AUTH_SECRET = "a".repeat(48);
    process.env.INSTAGRAM_ENCRYPTION_KEY = "k".repeat(64);
    const sealed = seal("IGAA-token");
    process.env.AUTH_SECRET = "b".repeat(48); // rotating the session secret keeps the token
    expect(open(sealed)).toBe("IGAA-token");
    delete process.env.INSTAGRAM_ENCRYPTION_KEY;
    expect(open(sealed)).toBeNull();
  });
});
