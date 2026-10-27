import type { CheckoutInput } from "../shop/checkout-schema";
import { type PricedProduct, PricingError, priceOrder } from "../shop/pricing";

export type PlacedOrder = { id: string; orderNumber: string; publicToken: string; locale: string };

/** Everything the order row needs, prices already recomputed on the server. */
export type NewOrder = {
  idempotencyKey: string;
  locale: string;
  customer: Omit<CheckoutInput, "lines" | "idempotencyKey" | "phoneCountry">;
  subtotal: string;
  currency: string;
  items: Array<{ productId: string; name: string; unitPrice: string; quantity: number }>;
};

/** Thrown by `createOrder` when another request already used the idempotency key. */
export class DuplicateOrderError extends Error {}

/** Storage seam: Prisma in production (src/lib/orders/order-repo.ts), in-memory in tests. */
export type OrderRepo = {
  findByIdempotencyKey(key: string): Promise<PlacedOrder | null>;
  findProducts(ids: string[]): Promise<PricedProduct[]>;
  /** One transaction: order number, order, item snapshots and the first timeline event. */
  createOrder(order: NewOrder): Promise<PlacedOrder>;
};

export type PlaceOrderResult =
  { ok: true; order: PlacedOrder; created: boolean } | { ok: false; error: PricingError };

/**
 * Places an order exactly once per idempotency key. A repeated submit (double click, retry
 * after a dropped response) returns the order the first submit created instead of a new one.
 */
export async function placeOrder(
  input: CheckoutInput,
  locale: string,
  repo: OrderRepo,
): Promise<PlaceOrderResult> {
  const existing = await repo.findByIdempotencyKey(input.idempotencyKey);
  if (existing) return { ok: true, order: existing, created: false };

  const products = await repo.findProducts(input.lines.map((line) => line.productId));
  let priced: ReturnType<typeof priceOrder>;
  try {
    priced = priceOrder(input.lines, products);
  } catch (error) {
    if (error instanceof PricingError) return { ok: false, error };
    throw error;
  }

  const { idempotencyKey } = input;
  const customer: NewOrder["customer"] = {
    name: input.name,
    email: input.email,
    phone: input.phone,
    whatsapp: input.whatsapp,
    country: input.country,
    city: input.city,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2,
    postalCode: input.postalCode,
    notes: input.notes,
    paymentMethod: input.paymentMethod,
  };
  try {
    const order = await repo.createOrder({
      idempotencyKey,
      locale,
      customer,
      subtotal: priced.subtotal,
      currency: priced.currency,
      items: priced.lines.map((line) => ({
        productId: line.product.id,
        // The record keeps the English name (the admin works in English); customer-facing
        // pages and emails show the localised name through the product relation.
        name: line.product.nameEn,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
      })),
    });
    return { ok: true, order, created: true };
  } catch (error) {
    // Two submits raced past the lookup above; the unique key let exactly one through.
    if (error instanceof DuplicateOrderError) {
      const winner = await repo.findByIdempotencyKey(idempotencyKey);
      if (winner) return { ok: true, order: winner, created: false };
    }
    throw error;
  }
}
