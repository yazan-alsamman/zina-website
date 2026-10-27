/** A media asset as rendered by <SmartImage> (mirrors the Prisma `MediaAsset` fields it needs). */
export type SmartAsset = {
  dir: string;
  widths: number[];
  width: number;
  height: number;
  lqip: string;
};

export type Localized<T = string> = { en: T; ar: T };

export type CatalogImage = { asset: SmartAsset; alt: Localized };

/**
 * A published product as the storefront sees it. Plain, serialisable data: it is cached with
 * "use cache" and handed to client components.
 */
export type CatalogProduct = {
  id: string;
  slug: string;
  name: Localized;
  description: Localized<string | null>;
  /** Zina's review, Markdown subset (see src/lib/review-markup.ts) */
  review: Localized<string | null>;
  /** First sentence of the review, plain text */
  quote: Localized;
  rating: number | null;
  /** DECIMAL string, e.g. "38.00" */
  price: string;
  priceCents: number;
  currency: string;
  stock: number | null;
  brand: { id: string; name: string; slug: string };
  images: CatalogImage[];
  isFeatured: boolean;
  featuredOrder: number | null;
  /** ISO timestamp */
  createdAt: string;
  updatedAt: string;
};
