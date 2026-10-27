import type { CatalogProduct } from "./types";

/**
 * Catalogue filters live in the URL (shareable links, back button, no JS needed):
 *   ?brand=dior&brand=chanel&rating=4.5&min=20&max=200&sort=price-asc&q=lipstick&page=2
 * Parsing is forgiving: unknown or malformed values are ignored, never an error page.
 */
export const PAGE_SIZE = 12;
export const CATALOG_SORTS = ["newest", "rating", "price-asc", "price-desc"] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];
export const RATING_STEPS = [5, 4.5, 4] as const;

export type CatalogQuery = {
  brands: string[];
  minRating: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  sort: CatalogSort;
  q: string;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

const list = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value : value ? [value] : []).flatMap((v) => v.split(","));
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function amount(value: string | undefined): number | null {
  if (!value || !/^\d{1,7}(?:\.\d{1,2})?$/.test(value.trim())) return null;
  return Number(value);
}

export function parseCatalogQuery(params: RawParams): CatalogQuery {
  const brands = [...new Set(list(params.brand).map((b) => b.trim().toLowerCase()))]
    .filter((b) => /^[a-z0-9-]{1,80}$/.test(b))
    .slice(0, 20);
  const rating = Number(first(params.rating));
  const sort = first(params.sort) as CatalogSort;
  const page = Math.trunc(Number(first(params.page)));
  let minPrice = amount(first(params.min));
  let maxPrice = amount(first(params.max));
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  return {
    brands,
    minRating: (RATING_STEPS as readonly number[]).includes(rating) ? rating : null,
    minPrice,
    maxPrice,
    sort: CATALOG_SORTS.includes(sort) ? sort : "newest",
    q: (first(params.q) ?? "").trim().slice(0, 80),
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, 50) : 1,
  };
}

/** Case-, accent- and Arabic-letter-variant-insensitive form for search. */
export function searchable(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟ]/g, "") // Latin accents, Arabic diacritics
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

export function applyCatalogQuery(products: readonly CatalogProduct[], query: CatalogQuery) {
  const needle = searchable(query.q);
  const matched = products.filter((product) => {
    if (query.brands.length > 0 && !query.brands.includes(product.brand.slug)) return false;
    if (query.minRating !== null && (product.rating ?? 0) < query.minRating) return false;
    if (query.minPrice !== null && product.priceCents < query.minPrice * 100) return false;
    if (query.maxPrice !== null && product.priceCents > query.maxPrice * 100) return false;
    if (needle) {
      const haystack = searchable(`${product.name.en} ${product.name.ar} ${product.brand.name}`);
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const newest = (a: CatalogProduct, b: CatalogProduct) => b.createdAt.localeCompare(a.createdAt);
  const sorted = [...matched].sort((a, b) => {
    switch (query.sort) {
      case "rating":
        return (b.rating ?? -1) - (a.rating ?? -1) || newest(a, b);
      case "price-asc":
        return a.priceCents - b.priceCents || newest(a, b);
      case "price-desc":
        return b.priceCents - a.priceCents || newest(a, b);
      default:
        return newest(a, b);
    }
  });

  const shown = query.page * PAGE_SIZE;
  return { items: sorted.slice(0, shown), total: sorted.length, hasMore: sorted.length > shown };
}

/** Query string for a catalogue link; `overrides` replace fields, page resets unless given. */
export function catalogSearch(query: CatalogQuery, overrides: Partial<CatalogQuery> = {}): string {
  const next = { ...query, page: 1, ...overrides };
  const params = new URLSearchParams();
  for (const brand of next.brands) params.append("brand", brand);
  if (next.minRating !== null) params.set("rating", String(next.minRating));
  if (next.minPrice !== null) params.set("min", String(next.minPrice));
  if (next.maxPrice !== null) params.set("max", String(next.maxPrice));
  if (next.sort !== "newest") params.set("sort", next.sort);
  if (next.q) params.set("q", next.q);
  if (next.page > 1) params.set("page", String(next.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}

export function isFiltered(query: CatalogQuery): boolean {
  return (
    query.brands.length > 0 ||
    query.minRating !== null ||
    query.minPrice !== null ||
    query.maxPrice !== null ||
    query.q !== ""
  );
}

/** Same brand first, then the newest of the rest. */
export function relatedProducts(
  all: readonly CatalogProduct[],
  product: CatalogProduct,
  limit = 4,
): CatalogProduct[] {
  const others = all.filter((candidate) => candidate.id !== product.id);
  return [
    ...others.filter((candidate) => candidate.brand.id === product.brand.id),
    ...others.filter((candidate) => candidate.brand.id !== product.brand.id),
  ].slice(0, limit);
}

/** Brands that have published products, for the filter. */
export function catalogBrands(products: readonly CatalogProduct[]) {
  const brands = new Map(products.map((product) => [product.brand.slug, product.brand]));
  return [...brands.values()].sort((a, b) => a.name.localeCompare(b.name));
}
