import { useTranslations } from "next-intl";
import { SmartImage } from "@/components/media/SmartImage";
import { site } from "@/config/site";
import type { FeedPost } from "@/lib/instagram/feed";

/** First line of a caption, shortened for the overlay. */
export function captionLine(caption: string | null, max = 70): string {
  const line =
    caption
      ?.split("\n")
      .find((part) => part.trim())
      ?.trim() ?? "";
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

/**
 * A real Instagram post: our locally stored image at its own proportions (masonry), a play or
 * album badge, and a link to the post on Instagram.
 */
export function InstagramTile({
  post,
  sizes,
  showCaption = true,
}: {
  post: FeedPost;
  sizes: string;
  showCaption?: boolean;
}) {
  const t = useTranslations("Instagram");
  const caption = captionLine(post.caption);

  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("open", { caption: caption || `@${site.instagram.handle}` })}
      data-cursor-label={t("view")}
      className="group relative block overflow-hidden bg-sand-100"
    >
      <div className="transition-transform duration-[1.4s] ease-luxe group-hover:scale-[1.04]">
        <SmartImage asset={post.asset} alt="" sizes={sizes} />
      </div>

      {post.mediaType !== "IMAGE" ? (
        <span
          aria-hidden
          title={post.mediaType === "VIDEO" ? t("video") : t("album")}
          className="absolute end-3 top-3 z-[2] grid size-9 place-items-center rounded-full bg-mocha-900/45 text-white backdrop-blur-sm"
        >
          {post.mediaType === "VIDEO" ? (
            <svg viewBox="0 0 16 16" className="size-3.5 translate-x-px rtl:-scale-x-100">
              <path d="M4.5 2.8v10.4L13 8z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor">
              <rect x="2.5" y="4.5" width="8.5" height="9" rx="1" />
              <path d="M5 2.5h7.5a1 1 0 0 1 1 1V11" />
            </svg>
          )}
        </span>
      ) : null}

      {showCaption ? (
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 z-[2] flex flex-col gap-1 bg-linear-to-t from-mocha-900/75 via-mocha-900/30 to-transparent p-4 pt-16 text-white md:p-6 md:pt-20"
        >
          {caption ? (
            <span dir="auto" className="font-display text-lead leading-tight italic md:text-h3">
              {caption}
            </span>
          ) : null}
          <span className="text-xs text-sand-100" lang="en" dir="ltr">
            @{site.instagram.handle}
          </span>
        </div>
      ) : null}
    </a>
  );
}
