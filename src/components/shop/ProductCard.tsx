import { useTranslations } from "next-intl";
import { ViewTransition } from "react";
import { SmartImage } from "@/components/media/SmartImage";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { displayPrice, displayRating } from "@/lib/shop/format";
import type { CatalogProduct } from "@/lib/shop/types";
import { RatingStars } from "./RatingStars";

/** Shared-element name: the card cover morphs into the product page's main image. */
export const productImageTransition = (id: string) => `product-image-${id}`;

/**
 * Editorial product card. The frame's aspect ratio is set by the grid; on hover (fine pointers)
 * the second image fades in and Zina's one-line verdict rises over it.
 */
export function ProductCard({
  product,
  locale,
  sizes,
  aspect = "4 / 5",
  priority,
  className,
}: {
  product: CatalogProduct;
  locale: Locale;
  sizes: string;
  aspect?: string;
  priority?: boolean;
  className?: string;
}) {
  const t = useTranslations("Shop");
  const [cover, second] = product.images;
  const name = product.name[locale];
  const quote = product.quote[locale];
  const soldOut = product.stock === 0;

  return (
    <article className={cn("group relative", className)} aria-labelledby={`card-${product.id}`}>
      <div className="relative overflow-hidden bg-sand-100" style={{ aspectRatio: aspect }}>
        {cover ? (
          <ViewTransition name={productImageTransition(product.id)} share="morph" default="none">
            <div className="absolute inset-0">
              <SmartImage
                asset={cover.asset}
                alt={cover.alt[locale]}
                sizes={sizes}
                priority={priority}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.4s] ease-luxe group-hover:scale-[1.03]"
              />
            </div>
          </ViewTransition>
        ) : (
          <div aria-hidden className="media-sand grain absolute inset-0" />
        )}
        {second ? (
          <div
            aria-hidden
            className="absolute inset-0 opacity-0 transition-opacity duration-700 ease-luxe [@media(hover:hover)]:group-hover:opacity-100"
          >
            <SmartImage
              asset={second.asset}
              alt=""
              sizes={sizes}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        ) : null}
        {quote ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-3 bg-linear-to-t from-mocha-900/75 via-mocha-900/35 to-transparent px-6 pt-16 pb-6 opacity-0 transition duration-700 ease-luxe [@media(hover:hover)]:block [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100"
          >
            <p className="font-display text-lead leading-snug text-white italic">“{quote}”</p>
          </div>
        ) : null}
        {soldOut ? (
          <span className="label absolute start-4 top-4 bg-white/90 px-3 py-1.5 text-mocha">
            {t("outOfStock")}
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="label text-sand-700" lang="en" dir="ltr">
            {product.brand.name}
          </p>
          <h3
            id={`card-${product.id}`}
            className="mt-2 text-[1.3rem] leading-tight text-mocha sm:text-h3"
          >
            {/* One link per card; it stretches over the whole card (image included). */}
            <Link
              href={`/products/${product.slug}`}
              data-cursor-label={t("view")}
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-1 focus-visible:after:outline-offset-8 focus-visible:after:outline-mocha"
            >
              {name}
            </Link>
          </h3>
          {product.rating !== null ? (
            <RatingStars
              value={product.rating}
              label={t("rating", { rating: displayRating(product.rating, locale) })}
              className="mt-3 text-sm"
            />
          ) : null}
        </div>
        <p className="shrink-0 font-latin-display text-[1.3rem] leading-none text-mocha lining-nums sm:pt-6 sm:text-h3">
          {displayPrice(product.priceCents, product.currency, locale)}
        </p>
      </div>
    </article>
  );
}
