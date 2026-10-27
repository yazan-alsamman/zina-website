import { describe, expect, it } from "vitest";
import { formatOrderNumber, isOrderNumber } from "@/lib/orders/number";
import {
  DuplicateOrderError,
  type NewOrder,
  type OrderRepo,
  type PlacedOrder,
  placeOrder,
} from "@/lib/orders/place-order";
import { createPublicToken, tokensMatch } from "@/lib/orders/token";
import { checkoutSchema, type CheckoutInput } from "@/lib/shop/checkout-schema";
import { type PricedProduct, PricingError, priceOrder } from "@/lib/shop/pricing";

const lipstick: PricedProduct = {
  id: "p1",
  nameEn: "Satin Lipstick",
  nameAr: "أحمر شفاه ساتان",
  price: "48.00",
  currency: "USD",
  stock: null,
  isPublished: true,
};
const perfume: PricedProduct = { ...lipstick, id: "p2", nameEn: "Eau de Parfum", price: "165.50" };

function formFields(overrides: Record<string, unknown> = {}) {
  return {
    name: "Layla Haddad",
    email: "Layla@Example.com",
    phoneCountry: "DE",
    phone: "030 1234567",
    whatsapp: "",
    country: "DE",
    city: "Berlin",
    addressLine1: "Unter den Linden 1",
    addressLine2: "",
    postalCode: "10117",
    notes: "",
    paymentMethod: "CASH_ON_DELIVERY",
    idempotencyKey: "0f8fad5b-d9cb-469f-a165-70867728950e",
    lines: [{ productId: "p1", quantity: 2 }],
    ...overrides,
  };
}

/** In-memory OrderRepo with the same unique-key behaviour as the database. */
function memoryRepo(products: PricedProduct[]) {
  const orders: Array<NewOrder & PlacedOrder> = [];
  let sequence = 100;
  const repo: OrderRepo & { orders: typeof orders } = {
    orders,
    async findByIdempotencyKey(key) {
      return orders.find((order) => order.idempotencyKey === key) ?? null;
    },
    async findProducts(ids) {
      return products.filter((product) => ids.includes(product.id));
    },
    async createOrder(order) {
      if (orders.some((existing) => existing.idempotencyKey === order.idempotencyKey)) {
        throw new DuplicateOrderError();
      }
      sequence += 1;
      const placed = {
        ...order,
        id: `o${sequence}`,
        orderNumber: formatOrderNumber(2026, sequence),
        publicToken: createPublicToken(),
      };
      orders.push(placed);
      return placed;
    },
  };
  return repo;
}

const parse = (overrides: Record<string, unknown> = {}): CheckoutInput =>
  checkoutSchema.parse(formFields(overrides));

describe("checkout validation", () => {
  it("normalises email and phone, and keeps only ids and quantities from the bag", () => {
    const input = parse({
      lines: [{ productId: "p1", quantity: 2, price: 0.01, unitPrice: "0.01", name: "Free" }],
    });
    expect(input.email).toBe("layla@example.com");
    expect(input.phone).toBe("+49 30 1234567");
    expect(input.lines).toEqual([{ productId: "p1", quantity: 2 }]);
  });

  it("rejects an unknown country and an invalid phone for the chosen country", () => {
    const issues = (fields: Record<string, unknown>) =>
      checkoutSchema
        .safeParse(formFields(fields))
        .error!.issues.map((issue) => [issue.path[0], issue.message]);
    expect(issues({ country: "XX" })).toContainEqual(["country", "country"]);
    expect(issues({ phone: "12" })).toEqual([["phone", "phone"]]);
    expect(issues({ whatsapp: "abc" })).toEqual([["whatsapp", "phone"]]);
  });

  it("accepts an international number whatever the selected country code", () => {
    expect(parse({ phoneCountry: "DE", phone: "+966 55 123 4567" }).phone).toBe("+966 55 123 4567");
  });
});

describe("server-side pricing", () => {
  it("ignores client prices and recomputes from the database", () => {
    const priced = priceOrder(
      // Even if a client smuggled a price into a line, priceOrder never reads it.
      [{ productId: "p1", quantity: 2, price: 1 } as never, { productId: "p2", quantity: 1 }],
      [lipstick, perfume],
    );
    expect(priced.subtotal).toBe("261.50");
    expect(priced.lines.map((line) => line.unitPrice)).toEqual(["48.00", "165.50"]);
  });

  it("merges duplicate lines and caps quantities", () => {
    const priced = priceOrder(
      [
        { productId: "p1", quantity: 6 },
        { productId: "p1", quantity: 9 },
      ],
      [lipstick],
    );
    expect(priced.lines).toHaveLength(1);
    expect(priced.lines[0].quantity).toBe(10);
  });

  it("refuses unpublished or unknown products, short stock and mixed currencies", () => {
    const draft = { ...perfume, isPublished: false };
    expect(() => priceOrder([{ productId: "p2", quantity: 1 }], [draft])).toThrow(PricingError);
    expect(() => priceOrder([{ productId: "nope", quantity: 1 }], [lipstick])).toThrow(
      expect.objectContaining({ code: "UNAVAILABLE", productIds: ["nope"] }),
    );
    expect(() =>
      priceOrder([{ productId: "p1", quantity: 3 }], [{ ...lipstick, stock: 2 }]),
    ).toThrow(expect.objectContaining({ code: "STOCK" }));
    expect(() =>
      priceOrder(
        [
          { productId: "p1", quantity: 1 },
          { productId: "p2", quantity: 1 },
        ],
        [lipstick, { ...perfume, currency: "EUR" }],
      ),
    ).toThrow(expect.objectContaining({ code: "CURRENCY" }));
    expect(() => priceOrder([], [lipstick])).toThrow(expect.objectContaining({ code: "EMPTY" }));
  });
});

describe("placing an order", () => {
  it("stores the database price, whatever the client claimed", async () => {
    const repo = memoryRepo([lipstick]);
    const result = await placeOrder(parse(), "en", repo);
    expect(result.ok).toBe(true);
    expect(repo.orders[0].subtotal).toBe("96.00");
    expect(repo.orders[0].items).toEqual([
      { productId: "p1", name: "Satin Lipstick", unitPrice: "48.00", quantity: 2 },
    ]);
  });

  it("is idempotent: a second submit with the same key returns the first order", async () => {
    const repo = memoryRepo([lipstick]);
    const first = await placeOrder(parse(), "en", repo);
    const second = await placeOrder(parse(), "en", repo);
    expect(repo.orders).toHaveLength(1);
    expect(first.ok && second.ok && second.order.orderNumber).toBe(
      first.ok && first.order.orderNumber,
    );
    expect(second.ok && second.created).toBe(false);
  });

  it("survives two submits racing past the lookup (unique key violation)", async () => {
    const repo = memoryRepo([lipstick]);
    const [a, b] = await Promise.all([
      placeOrder(parse(), "en", repo),
      placeOrder(parse(), "en", repo),
    ]);
    expect(repo.orders).toHaveLength(1);
    expect(a.ok && b.ok).toBe(true);
    expect([a.ok && a.created, b.ok && b.created].filter(Boolean)).toHaveLength(1);
  });

  it("reports unavailable products instead of creating anything", async () => {
    const repo = memoryRepo([{ ...lipstick, isPublished: false }]);
    const result = await placeOrder(parse(), "en", repo);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("UNAVAILABLE");
    expect(repo.orders).toHaveLength(0);
  });
});

describe("order numbers and tracking tokens", () => {
  it("formats ZAM-<year>-<6 digits>", () => {
    expect(formatOrderNumber(2026, 123)).toBe("ZAM-2026-000123");
    expect(formatOrderNumber(2026, BigInt(1234567))).toBe("ZAM-2026-1234567");
    expect(isOrderNumber("ZAM-2026-000123")).toBe(true);
    expect(isOrderNumber("ZAM-2026-12")).toBe(false);
    expect(isOrderNumber("../etc/passwd")).toBe(false);
    expect(() => formatOrderNumber(2026, 0)).toThrow();
  });

  it("creates 32-byte base64url tokens", () => {
    const token = createPublicToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(createPublicToken()).not.toBe(token);
  });

  it("matches tokens exactly, in constant time, and rejects anything else", () => {
    const token = createPublicToken();
    expect(tokensMatch(token, token)).toBe(true);
    expect(tokensMatch(token, `${token}x`)).toBe(false);
    expect(tokensMatch(token, token.slice(0, -1))).toBe(false);
    expect(tokensMatch(token, "")).toBe(false);
    expect(tokensMatch(token, undefined)).toBe(false);
    expect(tokensMatch(token, "x".repeat(500))).toBe(false);
  });
});
