import { describe, expect, it } from "vitest";
import { orderApprovedEmail, orderReceivedEmail, type EmailOrder } from "@/lib/email/templates";
import { customerTimeline } from "@/lib/orders/customer-timeline";
import { reviewExcerpt } from "@/lib/review-markup";
import { reconcileBag } from "@/lib/shop/bag";
import {
  applyCatalogQuery,
  catalogSearch,
  PAGE_SIZE,
  parseCatalogQuery,
  relatedProducts,
} from "@/lib/shop/catalog-query";
import { COUNTRY_CODES, countryOptions } from "@/lib/shop/countries";
import type { CatalogProduct } from "@/lib/shop/types";
import {
  businessWhatsappLink,
  checkoutWhatsappMessage,
  productWhatsappMessage,
} from "@/lib/shop/whatsapp";

describe("bag cleanup", () => {
  it("drops products that are unpublished, gone or sold out, and caps by stock", () => {
    const result = reconcileBag(
      [
        { productId: "kept", quantity: 2 },
        { productId: "unpublished", quantity: 1 },
        { productId: "sold-out", quantity: 1 },
        { productId: "low", quantity: 8 },
      ],
      [
        { id: "kept", stock: null },
        { id: "sold-out", stock: 0 },
        { id: "low", stock: 3 },
      ],
    );
    expect(result.lines).toEqual([
      { productId: "kept", quantity: 2 },
      { productId: "low", quantity: 3 },
    ]);
    expect(result.removed).toEqual(["unpublished", "sold-out"]);
  });
});

describe("WhatsApp messages", () => {
  const order = {
    orderNumber: "ZAM-2026-000123",
    customerName: "Layla Haddad",
    items: [
      { name: "Satin Lipstick", quantity: 2 },
      { name: "Eau de Parfum", quantity: 1 },
    ],
    subtotal: "261.00",
    currency: "USD",
    trackingUrl: "https://example.com/en/order/ZAM-2026-000123?t=abc",
  };

  it("builds the English checkout message", () => {
    const message = checkoutWhatsappMessage({ ...order, locale: "en" });
    expect(message).toContain("I have just placed order ZAM-2026-000123");
    expect(message).toContain("• Satin Lipstick × 2");
    expect(message).toContain("Subtotal: $261.00 (shipping to be confirmed)");
    expect(message).toContain("Track my order: https://example.com/en/order/");
  });

  it("builds the Arabic checkout message", () => {
    const message = checkoutWhatsappMessage({
      ...order,
      locale: "ar",
      items: [{ name: "أحمر شفاه ساتان", quantity: 2 }],
    });
    expect(message).toContain("أرسلت للتو الطلب ZAM-2026-000123");
    expect(message).toContain("• أحمر شفاه ساتان × 2");
    expect(message).toContain("المجموع الفرعي:");
    expect(message).toContain("261.00");
    expect(message).toContain("تتبّع الطلب: https://example.com/");
  });

  it("encodes the message into a wa.me link for the business number", () => {
    const link = businessWhatsappLink(
      productWhatsappMessage({
        locale: "en",
        name: "Satin Lipstick",
        brand: "Dior",
        url: "https://x.y/p",
      }),
      "+971 50 000 0000",
    );
    expect(link).toMatch(/^https:\/\/wa\.me\/971500000000\?text=/);
    expect(decodeURIComponent(link!.split("text=")[1])).toBe(
      "Hello, I would like to order Satin Lipstick by Dior.\nhttps://x.y/p",
    );
    expect(businessWhatsappLink("hi", "")).toBeNull();
  });
});

function product(id: string, overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id,
    slug: id,
    name: { en: `Product ${id}`, ar: `منتج ${id}` },
    description: { en: null, ar: null },
    review: { en: null, ar: null },
    quote: { en: "", ar: "" },
    rating: 4,
    price: "10.00",
    priceCents: 1000,
    currency: "USD",
    stock: null,
    brand: { id: "b-dior", name: "Dior", slug: "dior" },
    images: [],
    isFeatured: false,
    featuredOrder: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("catalogue query", () => {
  const chanel = { id: "b-chanel", name: "Chanel", slug: "chanel" };
  const products = [
    product("a", { priceCents: 4800, rating: 4.5, createdAt: "2026-10-03T00:00:00.000Z" }),
    product("b", {
      priceCents: 16500,
      rating: 5,
      brand: chanel,
      createdAt: "2026-10-02T00:00:00.000Z",
    }),
    product("c", {
      priceCents: 2000,
      rating: 3.5,
      createdAt: "2026-10-05T00:00:00.000Z",
      name: { en: "Rouge Lipstick", ar: "أحمر شفاه" },
    }),
  ];

  it("parses forgivingly and ignores junk", () => {
    const query = parseCatalogQuery({
      brand: ["dior", "Chanel", "<script>"],
      rating: "4.5",
      min: "200",
      max: "20",
      sort: "price-asc",
      page: "-3",
      q: "  lip ",
    });
    expect(query).toEqual({
      brands: ["dior", "chanel"],
      minRating: 4.5,
      minPrice: 20,
      maxPrice: 200,
      sort: "price-asc",
      q: "lip",
      page: 1,
    });
    expect(parseCatalogQuery({ rating: "3.7", sort: "cheapest" }).minRating).toBeNull();
  });

  it("filters by brand, rating, price and search, then sorts", () => {
    const run = (params: Record<string, string | string[]>) =>
      applyCatalogQuery(products, parseCatalogQuery(params)).items.map((p) => p.id);
    expect(run({})).toEqual(["c", "a", "b"]); // newest first
    expect(run({ brand: "chanel" })).toEqual(["b"]);
    expect(run({ rating: "4.5", sort: "rating" })).toEqual(["b", "a"]);
    expect(run({ max: "50", sort: "price-desc" })).toEqual(["a", "c"]);
    expect(run({ q: "lipstick" })).toEqual(["c"]);
    expect(run({ q: "احمر" })).toEqual(["c"]); // Arabic letter variants are normalised
  });

  it("paginates cumulatively and builds shareable links", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      product(String(i), { createdAt: new Date(2026, 0, i + 1).toISOString() }),
    );
    const first = applyCatalogQuery(many, parseCatalogQuery({}));
    expect(first.items).toHaveLength(PAGE_SIZE);
    expect(first.hasMore).toBe(true);
    const third = applyCatalogQuery(many, parseCatalogQuery({ page: "3" }));
    expect(third.items).toHaveLength(30);
    expect(third.hasMore).toBe(false);
    expect(catalogSearch(parseCatalogQuery({ brand: "dior", sort: "rating" }), { page: 2 })).toBe(
      "?brand=dior&sort=rating&page=2",
    );
  });

  it("puts same-brand products first in related items", () => {
    const related = relatedProducts(products, products[0], 4).map((p) => p.id);
    expect(related).toEqual(["c", "b"]);
  });
});

describe("customer timeline", () => {
  const at = (day: number) => new Date(2026, 9, day);

  it("uses customer wording, skips internal edits and lists what is ahead", () => {
    const timeline = customerTimeline({ status: "AWAITING_PAYMENT", paymentMethod: "CARD" }, [
      { fromStatus: null, toStatus: "PENDING_REVIEW", createdAt: at(1) },
      { fromStatus: "PENDING_REVIEW", toStatus: "PENDING_REVIEW", createdAt: at(1) }, // fee set
      { fromStatus: "PENDING_REVIEW", toStatus: "AWAITING_PAYMENT", createdAt: at(2) },
    ]);
    expect(timeline.map((entry) => `${entry.kind}:${entry.key}`)).toEqual([
      "done:placed",
      "done:confirmed",
      "upcoming:payment",
      "upcoming:shipped",
      "upcoming:delivered",
    ]);
  });

  it("tells payment apart from approval", () => {
    const keys = customerTimeline({ status: "APPROVED", paymentMethod: "CARD" }, [
      { fromStatus: null, toStatus: "PENDING_REVIEW", createdAt: at(1) },
      { fromStatus: "PENDING_REVIEW", toStatus: "AWAITING_PAYMENT", createdAt: at(2) },
      { fromStatus: "AWAITING_PAYMENT", toStatus: "APPROVED", createdAt: at(3) },
    ]).map((entry) => entry.key);
    expect(keys).toEqual(["placed", "confirmed", "paid", "shipped", "delivered"]);
  });
});

describe("review excerpts", () => {
  it("takes the first sentence without Markdown, in both scripts", () => {
    expect(reviewExcerpt("Glides on like **balm**. Wears like a stain.\n\n- one")).toBe(
      "Glides on like balm.",
    );
    expect(reviewExcerpt("- **Comfortable** all day\n- second")).toBe("Comfortable all day");
    expect(reviewExcerpt("هادئ لكنه حاضر. يدوم طويلًا.")).toBe("هادئ لكنه حاضر.");
    expect(reviewExcerpt("word ".repeat(60), 40).length).toBeLessThanOrEqual(40);
    expect(reviewExcerpt(null)).toBe("");
  });
});

describe("emails", () => {
  const order: EmailOrder = {
    locale: "en",
    orderNumber: "ZAM-2026-000123",
    customerName: "<b>Layla</b>",
    items: [{ name: "Lipstick <script>", quantity: 1, lineTotal: "$48.00" }],
    subtotal: "$48.00",
    shippingFee: null,
    total: null,
    paymentMethod: "CARD",
    paymentUrl: null,
    carrier: null,
    trackingNumber: null,
    trackingUrl: "https://example.com/en/order/ZAM-2026-000123?t=abc&x=1",
    shipTo: "Berlin, Germany",
  };

  it("escapes everything the customer typed and links the tracking page", () => {
    const email = orderReceivedEmail(order);
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<b>Layla</b>");
    expect(email.html).toContain("&lt;b&gt;Layla&lt;/b&gt;");
    expect(email.html).toContain("t=abc&amp;x=1");
    expect(email.text).toContain(order.trackingUrl);
  });

  it("writes Arabic emails right to left, with the pay link when there is one", () => {
    const email = orderApprovedEmail({
      ...order,
      locale: "ar",
      total: "$66.00",
      shippingFee: "$18.00",
      paymentUrl: "https://pay.example.com/abc",
    });
    expect(email.html).toContain('dir="rtl"');
    expect(email.subject).toContain("تم تأكيد طلبك");
    expect(email.html).toContain("https://pay.example.com/abc");
  });
});

describe("countries", () => {
  it("lists every ISO 3166-1 code once, with localised names", () => {
    expect(COUNTRY_CODES).toHaveLength(249);
    expect(new Set(COUNTRY_CODES).size).toBe(249);
    expect(countryOptions("en").find((c) => c.code === "DE")?.name).toBe("Germany");
    expect(countryOptions("ar").find((c) => c.code === "SA")?.name).toBe(
      "المملكة العربية السعودية",
    );
  });
});
