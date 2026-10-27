import { fromCents, type MoneyInput, toCents } from "../money";

/** What the client may send: product ids and quantities only. Prices are never read from it. */
export type BagLine = { productId: string; quantity: number };

export const MAX_QUANTITY = 10;
export const MAX_LINES = 30;

/** The server's view of a product, loaded fresh from the database at checkout. */
export type PricedProduct = {
  id: string;
  nameEn: string;
  nameAr: string;
  price: MoneyInput;
  currency: string;
  stock: number | null;
  isPublished: boolean;
};

export type PricingErrorCode = "EMPTY" | "UNAVAILABLE" | "STOCK" | "CURRENCY";

export class PricingError extends Error {
  constructor(
    readonly code: PricingErrorCode,
    readonly productIds: string[] = [],
  ) {
    super(code);
  }
}

/** Merges duplicate products and keeps quantities whole and within limits. */
export function normalizeLines(lines: readonly BagLine[]): BagLine[] {
  const merged = new Map<string, number>();
  for (const line of lines) {
    if (!line.productId || !Number.isFinite(line.quantity)) continue;
    const quantity = Math.trunc(line.quantity);
    if (quantity < 1) continue;
    merged.set(
      line.productId,
      Math.min(MAX_QUANTITY, (merged.get(line.productId) ?? 0) + quantity),
    );
  }
  return [...merged].slice(0, MAX_LINES).map(([productId, quantity]) => ({ productId, quantity }));
}

export type PricedLine = {
  product: PricedProduct;
  quantity: number;
  /** DECIMAL string, from the database price */
  unitPrice: string;
  lineTotalCents: number;
};

/**
 * Recomputes an order from database products: unit prices, line totals and subtotal all come
 * from `products`. Fails if anything is unpublished, missing, out of stock or mixes currencies.
 */
export function priceOrder(lines: readonly BagLine[], products: readonly PricedProduct[]) {
  const normalized = normalizeLines(lines);
  if (normalized.length === 0) throw new PricingError("EMPTY");

  const byId = new Map(products.map((product) => [product.id, product]));
  const unavailable = normalized
    .filter((line) => !byId.get(line.productId)?.isPublished)
    .map((line) => line.productId);
  if (unavailable.length > 0) throw new PricingError("UNAVAILABLE", unavailable);

  const priced: PricedLine[] = normalized.map((line) => {
    const product = byId.get(line.productId)!;
    const unitCents = toCents(product.price);
    return {
      product,
      quantity: line.quantity,
      unitPrice: fromCents(unitCents),
      lineTotalCents: unitCents * line.quantity,
    };
  });

  const short = priced
    .filter((line) => line.product.stock !== null && line.quantity > line.product.stock)
    .map((line) => line.product.id);
  if (short.length > 0) throw new PricingError("STOCK", short);

  const currencies = new Set(priced.map((line) => line.product.currency));
  if (currencies.size !== 1) throw new PricingError("CURRENCY");

  const subtotalCents = priced.reduce((sum, line) => sum + line.lineTotalCents, 0);
  return {
    lines: priced,
    subtotalCents,
    subtotal: fromCents(subtotalCents),
    currency: priced[0].product.currency,
  };
}
