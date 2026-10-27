"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { routing } from "@/i18n/routing";
import { notifyOrderPlaced } from "@/lib/email/notify";
import { prismaOrderRepo } from "@/lib/orders/order-repo";
import { placeOrder } from "@/lib/orders/place-order";
import { prisma } from "@/lib/prisma";
import { createRateLimiter } from "@/lib/rate-limit";
import { type CheckoutErrorKey, checkoutSchema, normalizePhone } from "@/lib/shop/checkout-schema";
import { businessWhatsappLink, checkoutWhatsappMessage } from "@/lib/shop/whatsapp";
import { absoluteUrl, trackingPath } from "@/lib/site-url";

export type CheckoutFormError =
  "fields" | "empty" | "invalid" | "unavailable" | "stock" | "currency" | "rateLimited" | "server";

export type CheckoutState = {
  ok?: boolean;
  error?: CheckoutFormError;
  fieldErrors?: Partial<Record<string, CheckoutErrorKey>>;
  /** Product ids that can no longer be ordered (the bag drops them). */
  unavailable?: string[];
  /** Submitted values, echoed so the form keeps what was typed (React resets forms). */
  values?: Record<string, string>;
  result?: { trackingPath: string; whatsappUrl: string | null };
};

// Five new orders per IP per ten minutes is plenty for a person and stops scripted floods.
const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 });

const ECHO = [
  "name",
  "email",
  "phone",
  "whatsapp",
  "city",
  "addressLine1",
  "addressLine2",
  "postalCode",
  "notes",
] as const;

async function clientIp() {
  const h = await headers();
  // Behind Nginx, X-Real-IP is set by our own proxy (see docs/deploy-notes.md).
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

export async function placeOrderAction(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  const values = Object.fromEntries(ECHO.map((key) => [key, text(key).slice(0, 1000)]));

  // Honeypot: a field people never see. Bots that fill it get a generic failure.
  if (text("company") !== "") return { error: "server", values };

  const locale = z.enum(routing.locales).catch("en").parse(text("locale"));
  let lines: unknown;
  try {
    lines = JSON.parse(text("lines") || "[]");
  } catch {
    lines = null;
  }

  const parsed = checkoutSchema.safeParse({
    name: text("name"),
    email: text("email"),
    phoneCountry: text("phoneCountry"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    country: text("country"),
    city: text("city"),
    addressLine1: text("addressLine1"),
    addressLine2: text("addressLine2"),
    postalCode: text("postalCode"),
    notes: text("notes"),
    paymentMethod: text("paymentMethod"),
    idempotencyKey: text("idempotencyKey"),
    lines,
  });

  if (!parsed.success) {
    const fieldErrors: Partial<Record<string, CheckoutErrorKey>> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message as CheckoutErrorKey;
    }
    // The phone check runs after the other fields pass; report it now too, all at once.
    if (!fieldErrors.phone && !normalizePhone(text("phone"), text("phoneCountry"))) {
      fieldErrors.phone = "phone";
    }
    if (fieldErrors.lines) return { error: "empty", values };
    if (fieldErrors.idempotencyKey) return { error: "invalid", values };
    return { error: "fields", fieldErrors, values };
  }

  if (!limiter.hit(await clientIp()).allowed) return { error: "rateLimited", values };

  let result: Awaited<ReturnType<typeof placeOrder>>;
  try {
    result = await placeOrder(parsed.data, locale, prismaOrderRepo);
  } catch (error) {
    console.error("[checkout] could not place order:", error);
    return { error: "server", values };
  }

  if (!result.ok) {
    const code = result.error.code;
    return {
      error:
        code === "UNAVAILABLE"
          ? "unavailable"
          : code === "STOCK"
            ? "stock"
            : code === "CURRENCY"
              ? "currency"
              : "empty",
      unavailable: code === "UNAVAILABLE" ? result.error.productIds : undefined,
      values,
    };
  }

  const { order, created } = result;
  // Emails go out after the response, once the order is safely committed.
  if (created) after(() => notifyOrderPlaced(order.id));

  const path = trackingPath(order.locale, order.orderNumber, order.publicToken);
  let whatsappUrl: string | null = null;
  if (parsed.data.paymentMethod === "WHATSAPP") {
    const full = await prisma.order.findUnique({
      where: { id: order.id },
      select: {
        customerName: true,
        subtotal: true,
        currency: true,
        items: {
          orderBy: { id: "asc" },
          select: { quantity: true, product: { select: { nameEn: true, nameAr: true } } },
        },
      },
    });
    if (full) {
      whatsappUrl = businessWhatsappLink(
        checkoutWhatsappMessage({
          locale: order.locale,
          orderNumber: order.orderNumber,
          customerName: full.customerName,
          items: full.items.map((item) => ({
            name: order.locale === "ar" ? item.product.nameAr : item.product.nameEn,
            quantity: item.quantity,
          })),
          subtotal: full.subtotal,
          currency: full.currency,
          trackingUrl: absoluteUrl(path),
        }),
      );
    }
  }

  return { ok: true, result: { trackingPath: path, whatsappUrl } };
}
