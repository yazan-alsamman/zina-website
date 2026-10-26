import { useTranslations } from "next-intl";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { brands } from "@/config/brands";
import { ConstellationMotion } from "./ConstellationMotion";

export function ConstellationSection() {
  const t = useTranslations("Houses");

  return (
    <section id="houses" aria-labelledby="houses-title" className="relative text-white">
      <ConstellationMotion>
        {/* Soft floor so the copy stays legible while names drift behind it */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-mocha-900/85 via-mocha-900/35 to-transparent"
        />
        <div className="relative mx-auto flex h-full max-w-content items-end px-gutter pb-[12svh]">
          <div data-houses-copy className="max-w-xl">
            <p className="label text-sand-200">{t("overline")}</p>
            <SplitReveal id="houses-title" className="mt-5 text-h1 text-white">
              {t("title")}
            </SplitReveal>
            <p className="mt-6 max-w-[46ch] text-lead text-sand-100">{t("body")}</p>
          </div>
        </div>

        {/* The constellation lives in WebGL; this is the same list for assistive technology. */}
        <ul className="sr-only" aria-label={t("listLabel")}>
          {brands.map((brand) => (
            <li key={brand.slug}>{brand.name}</li>
          ))}
        </ul>
      </ConstellationMotion>
    </section>
  );
}
