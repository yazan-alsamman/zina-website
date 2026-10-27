import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { PRODUCTS_TAG } from "../cache-tags";
import { toCents } from "../money";
import { prisma } from "../prisma";
import { reviewExcerpt } from "../review-markup";
import type { CatalogProduct } from "./types";

/**
 * Every published product, newest first, with brand and images. The storefront filters, sorts
 * and paginates this list in memory (a boutique catalogue stays small), so one cache entry
 * serves the catalogue, product pages, the bag and the landing edit. Admin saves call
 * updateTag(PRODUCTS_TAG), so changes show up immediately.
 */
export async function getPublishedProducts(): Promise<CatalogProduct[]> {
  "use cache";
  cacheTag(PRODUCTS_TAG);
  cacheLife("hours");

  try {
    const rows = await prisma.product.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      include: {
        brand: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { sortOrder: "asc" }, include: { asset: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: { en: row.nameEn, ar: row.nameAr },
      description: { en: row.descriptionEn, ar: row.descriptionAr },
      review: { en: row.reviewEn, ar: row.reviewAr },
      quote: { en: reviewExcerpt(row.reviewEn), ar: reviewExcerpt(row.reviewAr) },
      rating: row.rating === null ? null : Number(row.rating),
      price: row.price.toFixed(2),
      priceCents: toCents(row.price),
      currency: row.currency,
      stock: row.stock,
      brand: row.brand,
      images: row.images.flatMap((image) =>
        image.asset
          ? [
              {
                asset: {
                  dir: image.asset.dir,
                  widths: image.asset.widths,
                  width: image.asset.width,
                  height: image.asset.height,
                  lqip: image.asset.lqip,
                },
                alt: { en: image.altEn, ar: image.altAr },
              },
            ]
          : [],
      ),
      isFeatured: row.isFeatured,
      featuredOrder: row.featuredOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  } catch (error) {
    // The storefront degrades to its empty states rather than failing the page.
    console.warn("[catalog] could not load products:", (error as Error).message);
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  const products = await getPublishedProducts();
  return products.find((product) => product.slug === slug) ?? null;
}

/** Featured products for the landing "The Edit", in the owner's chosen order. */
export async function getFeaturedProducts(): Promise<CatalogProduct[]> {
  const products = await getPublishedProducts();
  return products
    .filter((product) => product.isFeatured)
    .sort(
      (a, b) =>
        (a.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (b.featuredOrder ?? Number.MAX_SAFE_INTEGER),
    );
}
