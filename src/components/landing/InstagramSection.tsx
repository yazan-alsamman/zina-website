import { useLocale, useTranslations } from "next-intl";
import { MediaFrame } from "@/components/media/MediaFrame";
import { Magnetic } from "@/components/motion/Magnetic";
import { RevealGroup } from "@/components/motion/RevealGroup";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { media } from "@/config/media";
import { site } from "@/config/site";
import type { Locale } from "@/i18n/routing";

const TILE_KEYS = ["t1", "t2", "t3", "t4", "t5", "t6"] as const;

export function InstagramSection() {
  const t = useTranslations("Instagram");
  const locale = useLocale() as Locale;

  return (
    <section
      id="instagram"
      aria-labelledby="instagram-title"
      className="relative z-10 bg-mist text-mocha"
    >
      <div className="mx-auto max-w-content px-gutter py-section">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <SplitReveal id="instagram-title" className="text-h1">
              {t("title")}
            </SplitReveal>
            <p className="mt-6 max-w-[44ch] text-lead">{t("body")}</p>
          </div>
          <Magnetic className="self-start md:self-auto">
            <a
              href={site.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              data-cursor-label={t("view")}
              className="inline-block rounded-full bg-mocha px-7 py-4 text-sm whitespace-nowrap text-white transition-colors duration-500 ease-luxe hover:bg-mocha-800"
            >
              {t("cta", { handle: site.instagram.handle })}
            </a>
          </Magnetic>
        </div>

        {/* Placeholder posts until the live feed arrives; each opens the real profile. */}
        <RevealGroup as="ul" className="mt-16 columns-2 gap-4 md:mt-20 md:columns-3 md:gap-6">
          {media.instagram.map((slot, i) => {
            const caption = t(`tiles.${TILE_KEYS[i]}`);
            return (
              <li key={slot.id} data-reveal className="mb-4 break-inside-avoid md:mb-6">
                <a
                  href={site.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("open", { caption })}
                  data-cursor-label={t("view")}
                  className="group relative block overflow-hidden"
                >
                  <div className="transition-transform duration-[1.4s] ease-luxe group-hover:scale-[1.04]">
                    <MediaFrame slot={slot} locale={locale} sizes="(min-width: 768px) 30vw, 45vw" />
                  </div>
                  <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 z-[2] flex flex-col gap-1 bg-linear-to-t from-mocha-900/75 via-mocha-900/30 to-transparent p-4 pt-16 text-white md:p-6 md:pt-20"
                  >
                    <span className="font-display text-lead leading-tight italic md:text-h3">
                      {caption}
                    </span>
                    <span className="text-xs text-sand-100" lang="en" dir="ltr">
                      @{site.instagram.handle}
                    </span>
                  </div>
                </a>
              </li>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
