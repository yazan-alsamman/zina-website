import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { RevealGroup } from "@/components/motion/RevealGroup";
import { AddToBag } from "@/components/shop/AddToBag";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { RatingStars } from "@/components/shop/RatingStars";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import { mediaUrl } from "@/lib/media/url";
import { reviewWithoutLead } from "@/lib/review-markup";
import { cachedReviewHtml } from "@/lib/sanitize";
import { getProductBySlug, getPublishedProducts } from "@/lib/shop/catalog";
import { relatedProducts } from "@/lib/shop/catalog-query";
import { displayPrice, displayRating } from "@/lib/shop/format";
import type { CatalogProduct } from "@/lib/shop/types";
import { businessWhatsappLink, productWhatsappMessage } from "@/lib/shop/whatsapp";
import { absoluteUrl } from "@/lib/site-url";

/**
 * Published products are prerendered. The page reads its (cached) product before streaming
 * anything, so an unknown or unpublished slug answers with a real 404 status, not a streamed
 * not-found page.
 */
export const instant = false;

export async function generateStaticParams() {
  const products = await getPublishedProducts();
  // Cache Components needs at least one param; a placeholder simply renders the 404 page.
  return products.length > 0
    ? products.map((product) => ({ slug: product.slug }))
    : [{ slug: "coming-soon" }];
}

const coverUrl = (product: CatalogProduct) => {
  const asset = product.images[0]?.asset;
  return asset ? mediaUrl(`${asset.dir}/w${Math.max(...asset.widths)}.webp`) : null;
};

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/products/[slug]">): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  const product = await getProductBySlug(decodeURIComponent(slug));
  if (!product) return {};

  const name = product.name[locale];
  const description =
    product.quote[locale] || product.description[locale] || `${name}, ${product.brand.name}`;
  const cover = coverUrl(product);
  const path = (l: string) => `/${l}/products/${product.slug}`;

  return {
    title: `${name} · ${product.brand.name}`,
    description,
    alternates: {
      canonical: path(locale),
      languages: Object.fromEntries(routing.locales.map((l) => [l, path(l)])),
    },
    openGraph: {
      title: `${name} · ${product.brand.name}`,
      description,
      url: path(locale),
      locale: locale === "ar" ? "ar_AR" : "en_US",
      images: cover
        ? [
            {
              url: cover,
              width: product.images[0].asset.width,
              height: product.images[0].asset.height,
              alt: product.images[0].alt[locale],
            },
          ]
        : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/[locale]/products/[slug]">) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  const product = await getProductBySlug(decodeURIComponent(slug));
  if (!product) notFound();

  const [all, t, shop, checkout] = await Promise.all([
    getPublishedProducts(),
    getTranslations("Product"),
    getTranslations("Shop"),
    getTranslations("Checkout"),
  ]);
  const name = product.name[locale];
  const description = product.description[locale];
  const quote = product.quote[locale];
  // The first sentence is the pull-quote; the body continues from there.
  const reviewHtml = await cachedReviewHtml(reviewWithoutLead(product.review[locale], quote));
  const related = relatedProducts(all, product, 4);
  const sameBrand = related.length > 0 && related[0].brand.id === product.brand.id;
  const url = absoluteUrl(`/${locale}/products/${product.slug}`);
  const whatsapp = businessWhatsappLink(
    productWhatsappMessage({ locale, name, brand: product.brand.name, url }),
  );
  const price = displayPrice(product.priceCents, product.currency, locale);
  const rating = product.rating;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: description ?? quote,
    sku: product.id,
    url,
    image: product.images.map((image) =>
      absoluteUrl(mediaUrl(`${image.asset.dir}/w${Math.max(...image.asset.widths)}.webp`)),
    ),
    brand: { "@type": "Brand", name: product.brand.name },
    offers: {
      "@type": "Offer",
      url,
      price: product.price,
      priceCurrency: product.currency,
      availability:
        product.stock === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(rating !== null
      ? {
          review: {
            "@type": "Review",
            author: { "@type": "Person", name: locale === "ar" ? "زينة المقري" : "Zina Al Mokri" },
            reviewRating: {
              "@type": "Rating",
              ratingValue: rating,
              bestRating: 5,
              worstRating: 0,
            },
            reviewBody: quote || undefined,
            inLanguage: locale,
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating,
            reviewCount: 1,
            bestRating: 5,
            worstRating: 0,
          },
        }
      : {}),
  };

  return (
    <main id="main" className="flex-1">
      <script
        type="application/ld+json"
        // Escaped so product text can never close the script element.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="mx-auto w-full max-w-[90rem] px-gutter pt-6 pb-section">
        <nav aria-label={t("breadcrumb")} className="mb-8 md:mb-12">
          <ol className="label flex flex-wrap items-center gap-x-3 gap-y-1 text-sand-700">
            <li>
              <Link href="/products" className="hover:text-mocha">
                {t("collection")}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link
                href={`/products?brand=${product.brand.slug}`}
                className="hover:text-mocha"
                lang="en"
              >
                {product.brand.name}
              </Link>
            </li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-7">
            <ProductGallery
              productId={product.id}
              images={product.images.map((image) => ({
                asset: image.asset,
                alt: image.alt[locale],
              }))}
            />
          </div>

          <div className="lg:sticky lg:top-10 lg:col-span-5 lg:col-start-8 lg:self-start lg:pt-6">
            <p className="label text-sand-700" lang="en" dir="ltr">
              {product.brand.name}
            </p>
            <h1 className="mt-4 text-h1 text-mocha">{name}</h1>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-sand-200 pb-6">
              {rating !== null ? (
                <RatingStars
                  value={rating}
                  label={shop("rating", { rating: displayRating(rating, locale) })}
                  showValue
                  valueText={displayRating(rating, locale)}
                  className="text-lg"
                />
              ) : (
                <p className="text-sm text-sand-700">{shop("notRated")}</p>
              )}
              <p className="font-latin-display text-h2 leading-none text-mocha lining-nums">
                {price}
              </p>
            </div>

            {description ? <p className="mt-6 text-lead text-mocha">{description}</p> : null}

            <div className="mt-10 flex flex-col gap-4">
              <AddToBag productId={product.id} stock={product.stock} />
              {product.stock !== null && product.stock > 0 && product.stock <= 5 ? (
                <p className="text-sm text-sand-700">
                  {shop("lowStock", { count: product.stock })}
                </p>
              ) : null}
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-3 rounded-full border border-mocha/25 px-8 py-3 text-sm text-mocha transition-colors duration-500 ease-luxe hover:border-mocha sm:self-start"
                >
                  <WhatsAppGlyph />
                  {shop("orderWhatsapp")}
                </a>
              ) : null}
            </div>

            <p className="mt-10 border-t border-sand-200 pt-6 text-sm text-sand-700">
              {/* Same wording as the checkout notice. */}
              {checkout("notice")}
            </p>
          </div>
        </div>
      </div>

      <section
        aria-labelledby="review-title"
        className="relative overflow-hidden bg-mocha text-white"
      >
        <div className="mx-auto grid max-w-[90rem] gap-12 px-gutter py-section lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="review-title" className="label text-sand-200">
              {t("review")}
            </h2>
            {rating !== null ? (
              <p className="mt-8 font-latin-display text-[clamp(4.5rem,3rem+6vw,9rem)] leading-none font-light text-sand-100 lining-nums">
                {displayRating(rating, locale)}
                <span className="ms-2 align-top text-h3 text-sand-200/70">/5</span>
              </p>
            ) : null}
          </div>
          <RevealGroup className="lg:col-span-8">
            {quote ? (
              <blockquote data-reveal className="relative">
                <span
                  aria-hidden
                  className="absolute -start-2 -top-10 font-latin-display text-[8rem] leading-none text-sand/30 select-none"
                >
                  “
                </span>
                <p className="relative font-display text-h2 text-white italic md:text-[clamp(2.25rem,1.6rem+2.2vw,3.75rem)] md:leading-[1.15]">
                  {quote}
                </p>
              </blockquote>
            ) : null}
            {reviewHtml ? (
              <div
                data-reveal
                className="prose-review mt-12 max-w-[60ch] text-lead text-sand-100 md:columns-1"
                dangerouslySetInnerHTML={{ __html: reviewHtml }}
              />
            ) : quote ? null : (
              <p data-reveal className="mt-6 text-lead text-sand-100">
                {t("noReview")}
              </p>
            )}
            <p data-reveal className="mt-12 font-display text-h3 text-sand-200 italic">
              {locale === "ar" ? "زينة" : "Zina"}
            </p>
          </RevealGroup>
        </div>
      </section>

      {related.length > 0 ? (
        <section
          aria-labelledby="related-title"
          className="mx-auto max-w-[90rem] px-gutter py-section"
        >
          <h2 id="related-title" className="text-h2 text-mocha">
            {sameBrand ? t("related", { brand: product.brand.name }) : t("relatedOthers")}
          </h2>
          <ul className="mt-14 grid grid-cols-2 gap-x-4 gap-y-14 sm:gap-x-8 lg:grid-cols-4 lg:gap-x-10">
            {related.map((item) => (
              <li key={item.id}>
                <ProductCard
                  product={item}
                  locale={locale}
                  sizes="(min-width: 1024px) 22vw, 46vw"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function WhatsAppGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.66 15l-1.3 4.76 4.88-1.28A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-2.9.76.78-2.83-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8s-.39-.12-.55.12-.63.8-.78.96-.29.19-.53.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.72-1.34a.45.45 0 0 0-.02-.43c-.06-.12-.55-1.33-.76-1.82s-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.74 2.74 0 0 0-.86 2.04 4.76 4.76 0 0 0 1 2.53 10.9 10.9 0 0 0 4.18 3.69c1.55.67 2.16.73 2.94.61a2.5 2.5 0 0 0 1.65-1.16 2.04 2.04 0 0 0 .14-1.16c-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}
