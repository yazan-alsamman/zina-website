import { useLocale, useTranslations } from "next-intl";
import { MediaFrame } from "@/components/media/MediaFrame";
import { Magnetic } from "@/components/motion/Magnetic";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { featuredReviews } from "@/config/featured";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { EditMotion } from "./EditMotion";

/** Five pearls, filled to the rating. */
function PearlRating({ value, label }: { value: number; label: string }) {
  return (
    <p className="flex items-center gap-1.5" role="img" aria-label={label}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.min(Math.max(value - i, 0), 1);
        return (
          <span
            key={i}
            aria-hidden
            className="relative block size-2.5 overflow-hidden rounded-full bg-white/15"
          >
            <span
              className="absolute inset-y-0 start-0 bg-sand-200"
              style={{ width: `${fill * 100}%` }}
            />
          </span>
        );
      })}
      <span aria-hidden className="ms-2 font-latin-display text-lead leading-none text-sand-100">
        {value.toFixed(1)}
      </span>
    </p>
  );
}

export function EditSection() {
  const t = useTranslations("Edit");
  const locale = useLocale() as Locale;

  return (
    <section id="edit" aria-labelledby="edit-title" className="relative z-10 bg-mocha text-white">
      <EditMotion>
        <div
          data-edit-viewport
          className="snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto"
        >
          <ul
            data-edit-track
            className="flex w-max items-end gap-[clamp(1.5rem,3vw,3.5rem)] px-gutter"
          >
            <li className="w-[min(78vw,26rem)] shrink-0 snap-start self-center pe-[4vw]">
              <p className="label text-sand-200">{t("overline")}</p>
              <SplitReveal id="edit-title" className="mt-6 text-h1 text-white">
                {t("title")}
              </SplitReveal>
              <p className="mt-6 max-w-[34ch] text-lead text-sand-100">{t("body")}</p>
            </li>

            {featuredReviews.map((item) => {
              // Prices read as "$38" in both locales; the element is marked LTR.
              const price = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: item.currency,
                maximumFractionDigits: 0,
              }).format(item.price);

              return (
                <li
                  key={item.slug}
                  className="w-[min(72vw,clamp(17rem,24vw,23rem))] shrink-0 snap-start"
                >
                  <article aria-labelledby={`edit-${item.slug}`}>
                    <TiltCard>
                      <Link
                        href={`/products/${item.slug}`}
                        tabIndex={-1}
                        aria-hidden
                        data-cursor-label={t("view")}
                        className="block"
                      >
                        <MediaFrame
                          slot={item.image}
                          locale={locale}
                          monogram={item.brand.charAt(0)}
                          sizes="(min-width: 768px) 22vw, 72vw"
                        />
                      </Link>
                    </TiltCard>

                    <p className="label mt-6 text-sand-200" lang="en" dir="ltr">
                      {item.brand}
                    </p>
                    <h3 id={`edit-${item.slug}`} className="mt-2 text-h3 text-white">
                      {item.product[locale]}
                    </h3>
                    <div className="mt-3">
                      <PearlRating
                        value={item.rating}
                        label={t("rating", { rating: item.rating })}
                      />
                    </div>
                    <blockquote className="mt-4 font-display text-lead text-mist italic">
                      {item.quote[locale]}
                    </blockquote>

                    <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/15 pt-5">
                      <p className="font-latin-display text-h3 leading-none" dir="ltr">
                        {price}
                      </p>
                      <Magnetic>
                        <Link
                          href={`/products/${item.slug}`}
                          data-cursor-label={t("order")}
                          className="inline-block rounded-full border border-sand/70 px-6 py-3 text-sm text-white transition-colors duration-500 ease-luxe hover:border-white hover:bg-white hover:text-mocha"
                        >
                          {t("order")}
                        </Link>
                      </Magnetic>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      </EditMotion>
    </section>
  );
}
