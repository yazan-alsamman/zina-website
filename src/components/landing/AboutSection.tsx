import { useLocale, useTranslations } from "next-intl";
import { MediaFrame } from "@/components/media/MediaFrame";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { media } from "@/config/media";
import { site } from "@/config/site";
import type { Locale } from "@/i18n/routing";
import { AboutMotion } from "./AboutMotion";

export function AboutSection() {
  const t = useTranslations("About");
  const locale = useLocale() as Locale;
  const numberFormat = new Intl.NumberFormat(`${locale}-u-nu-latn`);

  return (
    <section id="about" aria-labelledby="about-title" className="relative z-10">
      <AboutMotion className="bg-white text-mocha">
        <div className="mx-auto grid max-w-content gap-14 px-gutter py-section md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <div data-portrait className="overflow-hidden">
              <div data-portrait-inner>
                <MediaFrame
                  slot={media.portrait}
                  locale={locale}
                  monogram="Z"
                  sizes="(min-width: 768px) 40vw, 90vw"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center md:col-span-6 md:col-start-7">
            <p className="label text-sand-700">{t("overline")}</p>
            <SplitReveal id="about-title" className="mt-6 text-h1 text-mocha">
              {t("title")}
            </SplitReveal>
            <p className="mt-8 max-w-[52ch] text-lead text-mocha">{t("body")}</p>

            <dl
              data-stats
              aria-label={t("statsLabel")}
              className="mt-14 grid grid-cols-3 gap-6 border-t border-sand-200 pt-8"
            >
              {site.stats.map((stat) => (
                <div key={stat.key} data-stat className="flex flex-col-reverse gap-2">
                  <dt className="text-sm leading-snug text-sand-700">{t(`stats.${stat.key}`)}</dt>
                  <dd className="font-latin-display text-h2 leading-none font-light text-mocha">
                    {/* Isolated LTR run so "480+" never flips to "+480" in Arabic. */}
                    <span dir="ltr" className="inline-block">
                      {numberFormat.format(stat.value)}
                      {stat.suffix}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </AboutMotion>
    </section>
  );
}
