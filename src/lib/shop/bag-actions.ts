"use server";

import { z } from "zod";
import { reconcileBag } from "./bag";
import { getPublishedProducts } from "./catalog";
import { MAX_LINES } from "./pricing";
import type { CatalogImage } from "./types";

export type BagItem = {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  quantity: number;
  /** DECIMAL string from the database */
  price: string;
  priceCents: number;
  currency: string;
  stock: number | null;
  image: { asset: CatalogImage["asset"]; alt: string } | null;
};

const linesSchema = z
  .array(z.object({ productId: z.string().min(1).max(40), quantity: z.number().int().min(1) }))
  .max(MAX_LINES * 2);

/**
 * Current names, prices and images for the lines in a visitor's bag (public catalogue data
 * only). Lines whose product is no longer published are reported in `removed`.
 */
export async function resolveBag(
  rawLines: unknown,
  locale: string,
): Promise<{ items: BagItem[]; removed: string[] }> {
  const parsed = linesSchema.safeParse(rawLines);
  if (!parsed.success) return { items: [], removed: [] };

  const products = await getPublishedProducts();
  const { lines, removed } = reconcileBag(parsed.data, products);
  const byId = new Map(products.map((product) => [product.id, product]));
  const lang = locale === "ar" ? "ar" : "en";

  const items = lines.map((line): BagItem => {
    const product = byId.get(line.productId)!;
    const cover = product.images[0];
    return {
      productId: product.id,
      slug: product.slug,
      name: product.name[lang],
      brand: product.brand.name,
      quantity: line.quantity,
      price: product.price,
      priceCents: product.priceCents,
      currency: product.currency,
      stock: product.stock,
      image: cover ? { asset: cover.asset, alt: cover.alt[lang] } : null,
    };
  });

  return { items, removed };
}
