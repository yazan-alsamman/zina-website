import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CatalogGrid } from "@/components/shop/CatalogGrid";
import { CatalogShell } from "@/components/shop/CatalogShell";
import { site } from "@/config/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { getPublishedProducts } from "@/lib/shop/catalog";
import {
  applyCatalogQuery,
  catalogBrands,
  catalogSearch,
  isFiltered,
  PAGE_SIZE,
  parseCatalogQuery,
} from "@/lib/shop/catalog-query";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/products">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("Catalog");
  return {
    title: t("title"),
    description: t("intro"),
    alternates: {
      canonical: `/${locale}/products`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/products`])),
    },
  };
}

export default function ProductsPage({ searchParams }: PageProps<"/[locale]/products">) {
  const t = useTranslations("Catalog");

  return (
    <main id="main" className="mx-auto w-full max-w-[90rem] flex-1 px-gutter pt-10 pb-section">
      <header className="grid gap-6 pb-14 md:grid-cols-[1fr_minmax(0,26rem)] md:items-end md:pb-20">
        <div>
          <p className="label text-sand-700">{t("overline")}</p>
          <h1 className="mt-5 text-display text-mocha">{t("title")}</h1>
        </div>
        <p className="max-w-[34ch] text-lead text-mocha">{t("intro")}</p>
      </header>

      {/* Filters live in the URL, so the grid streams in behind the static header. */}
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Catalog({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/products">["searchParams"];
}) {
  const [raw, products, locale, t] = await Promise.all([
    searchParams,
    getPublishedProducts(),
    getLocale() as Promise<Locale>,
    getTranslations("Catalog"),
  ]);

  if (products.length === 0) {
    return (
      <EmptyState title={t("emptyTitle")} body={t("emptyBody")}>
        <a
          href={site.instagram.url}
          target="_blank"
          rel="noopener noreferrer"
          className="label mt-10 inline-block border-b border-mocha pb-1 text-mocha"
        >
          @{site.instagram.handle}
        </a>
      </EmptyState>
    );
  }

  const query = parseCatalogQuery(raw);
  const { items, total, hasMore } = applyCatalogQuery(products, query);
  const currencies = [...new Set(products.map((product) => product.currency))];

  return (
    <CatalogShell
      query={query}
      brands={catalogBrands(products)}
      currency={currencies.length === 1 ? currencies[0] : ""}
    >
      <p className="label py-8 text-sand-700" aria-live="polite">
        {t("results", { count: total })}
      </p>

      {items.length === 0 ? (
        <EmptyState title={t("noMatchTitle")} body={t("noMatchBody")}>
          {isFiltered(query) ? (
            <Link
              href={`/products${catalogSearch({ ...query, brands: [], minRating: null, minPrice: null, maxPrice: null, q: "" })}`}
              scroll={false}
              className="label mt-10 inline-block border-b border-mocha pb-1 text-mocha"
            >
              {t("clear")}
            </Link>
          ) : null}
        </EmptyState>
      ) : (
        <CatalogGrid products={items} locale={locale} />
      )}

      {hasMore || items.length > PAGE_SIZE ? (
        <div className="mt-24 flex flex-col items-center gap-6">
          <p className="text-sm text-sand-700">{t("showing", { shown: items.length, total })}</p>
          {hasMore ? (
            <Link
              href={`/products${catalogSearch(query, { page: query.page + 1 })}`}
              scroll={false}
              className="rounded-full border border-mocha/30 px-8 py-3.5 text-sm text-mocha transition-colors duration-500 ease-luxe hover:border-mocha hover:bg-mocha hover:text-white"
            >
              {t("loadMore")}
            </Link>
          ) : null}
        </div>
      ) : null}
    </CatalogShell>
  );
}

function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col items-center border-t border-sand-200 py-28 text-center">
      <span aria-hidden className="font-latin-display text-[5rem] leading-none text-sand-200">
        Z
      </span>
      <h2 className="mt-6 max-w-[22ch] text-h2 text-mocha">{title}</h2>
      <p className="mt-5 max-w-[42ch] text-lead text-sand-700">{body}</p>
      {children}
    </section>
  );
}

function CatalogSkeleton() {
  return (
    <div aria-hidden className="border-t border-sand-200 pt-24">
      <div className="grid grid-cols-2 gap-x-4 gap-y-14 lg:grid-cols-12 lg:gap-x-10">
        <div className="col-span-2 aspect-[4/5] animate-pulse bg-sand-100 lg:col-span-7" />
        <div className="aspect-[4/5] animate-pulse bg-sand-100 lg:col-span-4 lg:col-start-9 lg:mt-[38%]" />
      </div>
    </div>
  );
}
