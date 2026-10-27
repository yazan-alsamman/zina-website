import { formatMoney, type MoneyInput } from "../money";
import { whatsappLink } from "../orders/workflow";

type Locale = "en" | "ar";

/**
 * The message a customer sends to the house after a WhatsApp checkout, in their own language:
 * order number, items, subtotal (shipping still to be confirmed) and their tracking link.
 */
export function checkoutWhatsappMessage(order: {
  locale: string;
  orderNumber: string;
  customerName: string;
  items: ReadonlyArray<{ name: string; quantity: number }>;
  subtotal: MoneyInput;
  currency: string;
  trackingUrl: string;
}): string {
  const locale: Locale = order.locale === "ar" ? "ar" : "en";
  const subtotal = formatMoney(order.subtotal, order.currency, locale);
  const items = order.items.map((item) => `• ${item.name} × ${item.quantity}`).join("\n");

  if (locale === "ar") {
    return [
      `مرحبًا فريق زينة المقري، أرسلت للتو الطلب ${order.orderNumber}.`,
      "",
      items,
      "",
      `المجموع الفرعي: ${subtotal} (الشحن يُؤكَّد لاحقًا)`,
      `الاسم: ${order.customerName}`,
      `تتبّع الطلب: ${order.trackingUrl}`,
    ].join("\n");
  }
  return [
    `Hello Zina Al Mokri team, I have just placed order ${order.orderNumber}.`,
    "",
    items,
    "",
    `Subtotal: ${subtotal} (shipping to be confirmed)`,
    `Name: ${order.customerName}`,
    `Track my order: ${order.trackingUrl}`,
  ].join("\n");
}

/** "Order on WhatsApp" from a product page. */
export function productWhatsappMessage(product: {
  locale: string;
  name: string;
  brand: string;
  url: string;
}): string {
  if (product.locale === "ar") {
    return `مرحبًا، أودّ طلب ${product.name} من ${product.brand}.\n${product.url}`;
  }
  return `Hello, I would like to order ${product.name} by ${product.brand}.\n${product.url}`;
}

/** wa.me link to the house's own number (BUSINESS_WHATSAPP), or null if it is not configured. */
export function businessWhatsappLink(message: string, number = process.env.BUSINESS_WHATSAPP) {
  return number ? whatsappLink(number, message) : null;
}
