import "server-only";
import { formatMoney, fromCents, toCents } from "../money";
import { prisma } from "../prisma";
import { countryName } from "../shop/countries";
import { absoluteUrl, trackingPath } from "../site-url";
import { sendEmail } from "./mailer";
import {
  type EmailOrder,
  orderApprovedEmail,
  orderReceivedEmail,
  orderShippedEmail,
  ownerNewOrderEmail,
  paymentLinkEmail,
} from "./templates";

/**
 * Order notifications. Called from `after()` once the database write has committed, so they
 * never delay or fail the request; every error is logged and swallowed.
 */

async function loadOrder(
  orderId: string,
  nameLocale?: "en" | "ar",
): Promise<(EmailOrder & { email: string; id: string }) | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: { product: { select: { nameEn: true, nameAr: true } } },
      },
    },
  });
  if (!order) return null;

  const locale = order.locale === "ar" ? "ar" : "en";
  const lang = nameLocale ?? locale;
  const money = (value: { toString(): string }) => formatMoney(value, order.currency, lang);

  return {
    id: order.id,
    email: order.email,
    locale,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    items: order.items.map((item) => ({
      name:
        (lang === "ar" ? item.product?.nameAr : item.product?.nameEn) ?? item.productNameSnapshot,
      quantity: item.quantity,
      lineTotal: money(fromCents(toCents(item.unitPrice) * item.quantity)),
    })),
    subtotal: money(order.subtotal),
    shippingFee: order.shippingFee ? money(order.shippingFee) : null,
    total: order.total ? money(order.total) : null,
    paymentMethod: order.paymentMethod,
    paymentUrl: order.paymentUrl,
    carrier: order.carrier,
    trackingNumber: order.trackingNumber,
    trackingUrl: absoluteUrl(trackingPath(locale, order.orderNumber, order.publicToken)),
    shipTo: `${order.city}${lang === "ar" ? "، " : ", "}${countryName(order.country, lang)}`,
  };
}

async function safely(label: string, task: () => Promise<unknown>) {
  try {
    await task();
  } catch (error) {
    console.error(`[email] ${label} failed:`, (error as Error).message);
  }
}

export function notifyOrderPlaced(orderId: string) {
  return safely("order placed", async () => {
    const order = await loadOrder(orderId);
    if (!order) return;
    await sendEmail(order.email, orderReceivedEmail(order));

    const owner = process.env.ORDER_NOTIFY_EMAIL;
    if (owner) {
      const forOwner = await loadOrder(orderId, "en");
      if (forOwner) {
        await sendEmail(
          owner,
          ownerNewOrderEmail(forOwner, absoluteUrl(`/admin/orders/${orderId}`)),
        );
      }
    } else {
      console.info("[email] ORDER_NOTIFY_EMAIL not set: owner notification skipped");
    }
  });
}

export function notifyOrderApproved(orderId: string) {
  return safely("order approved", async () => {
    const order = await loadOrder(orderId);
    if (order) await sendEmail(order.email, orderApprovedEmail(order));
  });
}

export function notifyPaymentLink(orderId: string) {
  return safely("payment link", async () => {
    const order = await loadOrder(orderId);
    if (order?.paymentUrl) await sendEmail(order.email, paymentLinkEmail(order));
  });
}

export function notifyOrderShipped(orderId: string) {
  return safely("order shipped", async () => {
    const order = await loadOrder(orderId);
    if (order) await sendEmail(order.email, orderShippedEmail(order));
  });
}
