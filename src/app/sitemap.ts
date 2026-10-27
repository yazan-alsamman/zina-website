import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getPublishedProducts } from "@/lib/shop/catalog";
import { absoluteUrl } from "@/lib/site-url";

const PAGES = ["", "/products", "/journal", "/about", "/shipping", "/privacy", "/terms"] as const;

/** Every public page in both languages, each entry listing its other-language alternate. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getPublishedProducts();

  const entry = (path: string, lastModified?: string, priority?: number) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(`/${locale}${path}`),
      lastModified,
      priority,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, absoluteUrl(`/${l}${path}`)])),
      },
    }));

  return [
    ...PAGES.flatMap((path) => entry(path, undefined, path === "" ? 1 : 0.6)),
    ...products.flatMap((product) => entry(`/products/${product.slug}`, product.updatedAt, 0.8)),
  ];
}
