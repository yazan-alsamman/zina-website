import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { brands as configBrands } from "@/config/brands";
import { BRANDS_TAG } from "./cache-tags";
import { prisma } from "./prisma";

/**
 * Names for the landing constellation: brands that have at least one published product,
 * falling back to the curated list in src/config/brands.ts while the catalogue is empty or the
 * database is unreachable. Cached; admin actions revalidate the `brands` tag.
 */
export async function getConstellationBrandNames(): Promise<string[]> {
  "use cache";
  cacheTag(BRANDS_TAG);
  cacheLife("hours");

  try {
    const rows = await prisma.brand.findMany({
      where: { products: { some: { isPublished: true } } },
      select: { name: true },
      orderBy: { name: "asc" },
    });
    if (rows.length > 0) return rows.map((row) => row.name);
  } catch (error) {
    console.warn("[brands] falling back to config list:", (error as Error).message);
  }

  // Priority-1 houses first so low-power devices (which show fewer names) keep the best known.
  return [...configBrands].sort((a, b) => a.priority - b.priority).map((brand) => brand.name);
}
