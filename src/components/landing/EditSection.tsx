import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { MediaFrame } from "@/components/media/MediaFrame";
import { SmartImage } from "@/components/media/SmartImage";
import { Magnetic } from "@/components/motion/Magnetic";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { featuredReviews } from "@/config/featured";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { displayPrice, displayRating } from "@/lib/shop/format";
import type { CatalogProduct } from "@/lib/shop/types";
import { EditMotion } from "./EditMotion";

/** Fewer featured products than this and the edit shows the curated placeholders instead. */
const MIN_FEATURED = 3;

type EditItem = {
  key: string;
  href: string;
  brand: string;
  name: string;
  rating: number | null;
  quote: string;
  price: string;
  image: ReactNode;
};

function toItems(products: readonly CatalogProduct[], locale: Locale): EditItem[] {
  if (products.length >= MIN_FEATURED) {
    return products.map((product) => {
      const cover = product.images[0];
      return {
        key: product.id,
        href: `/products/${product.slug}`,
        brand: product.brand.name,
        name: product.name[locale],
        rating: product.rating,
        quote: product.quote[locale],
        price: displayPrice(product.priceCents, product.currency, locale),
        image: (
          <div className="relative aspect-[4/5] overflow-hidden bg-mocha-800">
            {cover ? (
              <SmartImage
                asset={cover.asset}
                alt={cover.alt[locale]}
                sizes="(min-width: 768px) 22vw, 72vw"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
          </div>
        ),
      };
    });
  }

  // Placeholders link to the collection: their products do not exist yet.
  return featuredReviews.map((item) => ({
    key: item.slug,
    href: "/products",
    brand: item.brand,
    name: item.product[locale],
    rating: item.rating,
    quote: item.quote[locale],
    price: displayPrice(item.price * 100, item.currency, locale),
    image: (
      <MediaFrame
        slot={item.image}
        locale={locale}
        monogram={item.brand.charAt(0)}
        sizes="(min-width: 768px) 22vw, 72vw"
      />
    ),
  }));
}

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

export function EditSection({ products }: { products: readonly CatalogProduct[] }) {
  const t = useTranslations("Edit");
  const locale = useLocale() as Locale;
  const items = toItems(products, locale);

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

            {items.map((item) => (
              <li
                key={item.key}
                className="w-[min(72vw,clamp(17rem,24vw,23rem))] shrink-0 snap-start"
              >
                <article aria-labelledby={`edit-${item.key}`}>
                  <TiltCard>
                    <Link
                      href={item.href}
                      tabIndex={-1}
                      aria-hidden
                      data-cursor-label={t("view")}
                      className="block"
                    >
                      {item.image}
                    </Link>
                  </TiltCard>

                  <p className="label mt-6 text-sand-200" lang="en" dir="ltr">
                    {item.brand}
                  </p>
                  <h3 id={`edit-${item.key}`} className="mt-2 text-h3 text-white">
                    {item.name}
                  </h3>
                  {item.rating !== null ? (
                    <div className="mt-3">
                      <PearlRating
                        value={item.rating}
                        label={t("rating", { rating: displayRating(item.rating, locale) })}
                      />
                    </div>
                  ) : null}
                  {item.quote ? (
                    <blockquote className="mt-4 font-display text-lead text-mist italic">
                      {item.quote}
                    </blockquote>
                  ) : null}

                  <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/15 pt-5">
                    <p className="font-latin-display text-h3 leading-none lining-nums">
                      {item.price}
                    </p>
                    <Magnetic>
                      <Link
                        href={item.href}
                        data-cursor-label={t("order")}
                        className="inline-block rounded-full border border-sand/70 px-6 py-3 text-sm text-white transition-colors duration-500 ease-luxe hover:border-white hover:bg-white hover:text-mocha"
                      >
                        {t("order")}
                      </Link>
                    </Magnetic>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </EditMotion>
    </section>
  );
}
