import type { Metadata } from "next";
import { EmptyState, PageHeader, Panel } from "@/components/admin/ui";
import { LocalTime } from "@/components/LocalTime";
import { requireAdmin } from "@/lib/auth/session";
import { readStatus } from "@/lib/instagram/settings";
import { mediaUrl } from "@/lib/media/url";
import { prisma } from "@/lib/prisma";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";
import { ManualPostForm, PostActions, SyncNowButton } from "./InstagramForms";

export const metadata: Metadata = { title: "Instagram" };

const TYPE_LABELS = { IMAGE: "Photo", VIDEO: "Video", CAROUSEL_ALBUM: "Carousel" } as const;

export default async function InstagramPage() {
  await requireAdmin();
  const [status, posts] = await Promise.all([
    readStatus(),
    prisma.instagramPost.findMany({
      orderBy: { timestamp: "desc" },
      take: 60,
      include: { asset: { select: { dir: true, widths: true } } },
    }),
  ]);
  const { lastSync, token } = status;
  const connected = token !== null;
  const daysLeft = token?.daysLeft ?? null;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Journal"
        title="Instagram"
        description={
          <>
            Latest posts from @{site.instagram.handle}, synced every 6 hours and stored on this
            server. Hidden posts never show on the site.
          </>
        }
        actions={<SyncNowButton disabled={!connected} />}
      />

      <div className="grid gap-px border border-sand-200 bg-sand-200 md:grid-cols-3">
        <Stat label="Connection">
          {connected ? (
            <span>
              Connected · {token.source === "env" ? "token from environment" : "stored token"}
            </span>
          ) : (
            <span>
              Not configured. Set <code className="text-xs">INSTAGRAM_ACCESS_TOKEN</code>, see{" "}
              <code className="text-xs">docs/instagram-setup.md</code>.
            </span>
          )}
        </Stat>
        <Stat label="Token expiry">
          {token?.expiresAt ? (
            <span className={cn(daysLeft !== null && daysLeft < 10 && "text-[#9b4a3c]")}>
              <LocalTime value={token.expiresAt.toISOString()} options={{ dateStyle: "medium" }} />{" "}
              · {daysLeft} days left, refreshed automatically
            </span>
          ) : connected ? (
            "Learned at the first refresh"
          ) : (
            "—"
          )}
        </Stat>
        <Stat label="Last sync">
          {lastSync ? (
            <span className="flex flex-col gap-1">
              <span>
                <LocalTime value={lastSync.at} /> ·{" "}
                {lastSync.state === "synced"
                  ? "OK"
                  : lastSync.state === "not_configured"
                    ? "Not configured"
                    : "Error"}
              </span>
              <span className="text-xs text-sand-700">{lastSync.message}</span>
            </span>
          ) : (
            "Never"
          )}
        </Stat>
      </div>

      <Panel
        title="Add a post by hand"
        aside={<span className="text-xs text-sand-700">Fallback</span>}
      >
        <p className="mb-6 max-w-prose text-sm text-sand-700">
          Until Instagram is connected (or for a post the sync cannot fetch), upload the image and
          paste the post&apos;s link. It appears on the landing page and the journal, newest first.
        </p>
        <ManualPostForm />
      </Panel>

      <Panel title={`Posts (${posts.length})`}>
        {posts.length === 0 ? (
          <EmptyState
            title="No posts yet"
            body="Sync Instagram or add a post by hand. The site shows its placeholders meanwhile."
          />
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <li
                key={post.id}
                className={cn("flex flex-col gap-3", post.isHidden && "opacity-55")}
              >
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block aspect-[4/5] overflow-hidden bg-sand-100"
                >
                  {post.asset ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                    <img
                      src={mediaUrl(`${post.asset.dir}/w${Math.min(...post.asset.widths)}.webp`)}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : null}
                  <span className="absolute start-2 top-2 bg-white/90 px-2 py-1 text-[0.7rem] text-mocha">
                    {TYPE_LABELS[post.mediaType]}
                    {post.isManual ? " · manual" : ""}
                    {post.removedAt ? " · removed on Instagram" : post.isHidden ? " · hidden" : ""}
                  </span>
                </a>
                <p className="line-clamp-2 text-sm text-mocha">{post.caption ?? "No caption"}</p>
                <p className="text-xs text-sand-700">
                  <LocalTime
                    value={post.timestamp.toISOString()}
                    options={{ dateStyle: "medium" }}
                  />
                  {post.likeCount !== null ? ` · ${post.likeCount} likes` : ""}
                </p>
                <PostActions id={post.id} hidden={post.isHidden} manual={post.isManual} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 bg-white p-6">
      <p className="label text-sand-700">{label}</p>
      <div className="text-sm text-mocha">{children}</div>
    </div>
  );
}
