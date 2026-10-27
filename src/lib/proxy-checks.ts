import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { isOrderNumber } from "./orders/number";
import { tokensMatch } from "./orders/token";

/**
 * Existence checks for the proxy, so unknown products and wrong order links answer with a real
 * 404 status. (Pages stream: once the first byte is out the status is fixed at 200, and the
 * page's own notFound() can only add a noindex tag.) Pages repeat these checks themselves.
 *
 * Uses its own small connection pool: the proxy runs before the app and must stay cheap.
 */
let client: PrismaClient | null = null;

function db() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  client ??= new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 3 }) });
  return client;
}

// Published slugs are remembered briefly; misses are always re-checked, so a product the owner
// has just published is never answered with a stale 404.
const PUBLISHED_TTL_MS = 60_000;
const published = new Map<string, number>();

/** null = could not check (database unavailable): let the page decide. */
export async function isPublishedSlug(slug: string): Promise<boolean | null> {
  const now = Date.now();
  if ((published.get(slug) ?? 0) > now) return true;
  const prisma = db();
  if (!prisma) return null;
  try {
    const product = await prisma.product.findFirst({
      where: { slug, isPublished: true },
      select: { id: true },
    });
    if (!product) return false;
    if (published.size > 2_000) published.clear();
    published.set(slug, now + PUBLISHED_TTL_MS);
    return true;
  } catch {
    return null;
  }
}

export async function orderLinkIsValid(
  orderNumber: string,
  token: string | null,
): Promise<boolean | null> {
  if (!isOrderNumber(orderNumber) || !token) return false;
  const prisma = db();
  if (!prisma) return null;
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: { publicToken: true },
    });
    return order ? tokensMatch(order.publicToken, token) : false;
  } catch {
    return null;
  }
}
