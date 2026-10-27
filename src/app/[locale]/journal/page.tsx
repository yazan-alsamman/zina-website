import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { InstagramTile, captionLine } from "@/components/instagram/InstagramTile";
import { LocalTime } from "@/components/LocalTime";
import { MediaFrame } from "@/components/media/MediaFrame";
import { media } from "@/config/media";
import { site } from "@/config/site";
import { type Locale, routing } from "@/i18n/routing";
import { getInstagramFeed } from "@/lib/instagram/feed";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/journal">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("Journal");
  return {
    title: t("title"),
    description: t("intro", { handle: site.instagram.handle }),
    alternates: {
      canonical: `/${locale}/journal`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/journal`])),
    },
  };
}

/** Zina's Instagram as an editorial journal: the synced posts with their captions. */
export default async function JournalPage({ params }: PageProps<"/[locale]/journal">) {
  const { locale } = (await params) as { locale: Locale };
  const posts = await getInstagramFeed(24);
  return <Journal locale={locale} posts={posts} />;
}

function Journal({
  locale,
  posts,
}: {
  locale: Locale;
  posts: Awaited<ReturnType<typeof getInstagramFeed>>;
}) {
  const t = useTranslations("Journal");
  const follow = (
    <a
      href={site.instagram.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block rounded-full bg-mocha px-7 py-4 text-sm whitespace-nowrap text-white transition-colors duration-500 ease-luxe hover:bg-mocha-800"
    >
      {t("follow", { handle: site.instagram.handle })}
    </a>
  );

  return (
    <main id="main" className="mx-auto w-full max-w-[90rem] flex-1 px-gutter pt-10 pb-section">
      <header className="grid gap-8 border-b border-sand-200 pb-14 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="label text-sand-700">{t("overline")}</p>
          <h1 className="mt-5 text-display text-mocha">{t("title")}</h1>
          <p className="mt-6 max-w-[48ch] text-lead text-mocha">
            {t("intro", { handle: site.instagram.handle })}
          </p>
        </div>
        {follow}
      </header>

      {posts.length === 0 ? (
        <section className="grid gap-12 pt-16 md:grid-cols-[1fr_1.4fr] md:items-center">
          <div>
            <h2 className="text-h2 text-mocha">{t("emptyTitle")}</h2>
            <p className="mt-4 text-lead text-sand-700">{t("emptyBody")}</p>
          </div>
          <ul className="columns-2 gap-4" aria-hidden>
            {media.instagram.slice(0, 4).map((slot) => (
              <li key={slot.id} className="mb-4 break-inside-avoid">
                <MediaFrame slot={slot} locale={locale} sizes="25vw" />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <ul className="mt-14 columns-1 gap-8 sm:columns-2 lg:columns-3 lg:gap-10">
          {posts.map((post) => {
            const caption = captionLine(post.caption, 220);
            return (
              <li key={post.id} className="mb-12 break-inside-avoid">
                <article>
                  <InstagramTile
                    post={post}
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"
                    showCaption={false}
                  />
                  <p className="mt-4 text-xs text-sand-700">
                    <LocalTime
                      value={post.timestamp}
                      locale={`${locale}-u-nu-latn`}
                      options={{ dateStyle: "long" }}
                      utcLabel={false}
                    />
                  </p>
                  {caption ? (
                    <p dir="auto" className="mt-2 font-display text-lead leading-snug text-mocha">
                      {caption}
                    </p>
                  ) : null}
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label mt-3 inline-block border-b border-sand pb-1 text-sand-700 hover:text-mocha"
                  >
                    {t("open")}
                  </a>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
