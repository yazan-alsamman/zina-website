import type { Metadata } from "next";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { MediaFrame } from "@/components/media/MediaFrame";
import { RevealGroup } from "@/components/motion/RevealGroup";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { media } from "@/config/media";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("Pages");
  return {
    title: t("about.title"),
    description: t("about.lead"),
    alternates: {
      canonical: `/${locale}/about`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/about`])),
    },
  };
}

type Section = { title: string; body: string };

export default function AboutPage() {
  const t = useTranslations("Pages");
  const locale = useLocale() as Locale;
  const sections = t.raw("about.sections") as Section[];

  return (
    <main id="main" className="flex-1">
      <section className="mx-auto grid max-w-[90rem] gap-12 px-gutter pt-10 pb-section lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-6 lg:pb-16">
          <p className="label inline-block border border-sand px-3 py-1.5 text-sand-700">
            {t("draft")}
          </p>
          <p className="label mt-8 text-sand-700">{t("about.overline")}</p>
          <SplitReveal as="h1" className="mt-5 text-display text-mocha">
            {t("about.title")}
          </SplitReveal>
          <p className="mt-10 max-w-[38ch] font-display text-h3 text-mocha italic">
            {t("about.lead")}
          </p>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <MediaFrame
            slot={media.portrait}
            locale={locale}
            monogram="Z"
            priority
            sizes="(min-width: 1024px) 38vw, 92vw"
          />
          <p className="mt-3 text-xs text-sand-700">{t("about.portrait")}</p>
        </div>
      </section>

      <section className="bg-sand-100">
        <div className="mx-auto grid max-w-[90rem] gap-16 px-gutter py-section lg:grid-cols-12">
          <div className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-12">
              <MediaFrame
                slot={media.studio}
                locale={locale}
                sizes="(min-width: 1024px) 28vw, 0px"
              />
              <p className="mt-3 text-xs text-sand-700">{t("about.studio")}</p>
            </div>
          </div>
          <RevealGroup as="ol" className="flex flex-col lg:col-span-7 lg:col-start-6">
            {sections.map((section, index) => (
              <li
                key={section.title}
                data-reveal
                className="grid gap-4 border-t border-sand-200 py-12 first:border-t-0 first:pt-0 sm:grid-cols-[4rem_1fr]"
              >
                <span
                  aria-hidden
                  className="font-latin-display text-h2 leading-none font-light text-sand-700 lining-nums"
                >
                  {index + 1}
                </span>
                <div>
                  <h2 className="text-h2 text-mocha">{section.title}</h2>
                  <p className="mt-5 max-w-prose text-lead text-mocha">{section.body}</p>
                </div>
              </li>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="mx-auto flex max-w-content flex-col items-center px-gutter py-section text-center">
        <p className="font-display text-h2 text-mocha italic">
          {locale === "ar" ? "زينة" : "Zina"}
        </p>
        <Link
          href="/products"
          className="mt-10 rounded-full border border-mocha/30 px-8 py-3.5 text-sm text-mocha transition-colors duration-500 ease-luxe hover:border-mocha hover:bg-mocha hover:text-white"
        >
          {t("about.cta")}
        </Link>
      </section>
    </main>
  );
}
