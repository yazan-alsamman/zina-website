import { formatMoney, type MoneyInput } from "../money";

/** Mirrors the Prisma enums (kept here so this module stays importable from tests and clients). */
export const ORDER_STATUSES = [
  "PENDING_REVIEW",
  "AWAITING_PAYMENT",
  "APPROVED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ["CASH_ON_DELIVERY", "CARD", "WHATSAPP"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_REVIEW: "Pending review",
  AWAITING_PAYMENT: "Awaiting payment",
  APPROVED: "Approved",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: "Cash on delivery",
  CARD: "Card",
  WHATSAPP: "WhatsApp",
};

/** The only legal moves. Delivered and cancelled orders are final. */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_REVIEW: ["AWAITING_PAYMENT", "APPROVED", "CANCELLED"],
  AWAITING_PAYMENT: ["APPROVED", "CANCELLED"],
  APPROVED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** Statuses that count as revenue (approved and beyond). */
export const REVENUE_STATUSES: readonly OrderStatus[] = ["APPROVED", "SHIPPED", "DELIVERED"];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class TransitionError extends Error {}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new TransitionError(
      `An order cannot move from ${STATUS_LABELS[from]} to ${STATUS_LABELS[to]}.`,
    );
  }
}

/**
 * Where "Approve" leads: cash on delivery is approved outright; card and WhatsApp orders wait
 * for payment first.
 */
export function approvalTarget(method: PaymentMethod): OrderStatus {
  return method === "CASH_ON_DELIVERY" ? "APPROVED" : "AWAITING_PAYMENT";
}

/**
 * Approval checks: the order must still be pending review and have a shipping fee.
 * Returns the status the order moves to.
 */
export function planApproval(order: {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  shippingFee: MoneyInput | null;
}): OrderStatus {
  if (order.status !== "PENDING_REVIEW") {
    throw new TransitionError("Only orders pending review can be approved.");
  }
  if (order.shippingFee === null) {
    throw new TransitionError("Set the shipping fee before approving.");
  }
  const target = approvalTarget(order.paymentMethod);
  assertTransition(order.status, target);
  return target;
}

/** The shipping fee can be changed only before approval. */
export function canEditShippingFee(status: OrderStatus): boolean {
  return status === "PENDING_REVIEW";
}

/** Digits only, as wa.me expects (country code included, no "+" or spaces). */
export function whatsappNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "").replace(/^00/, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function whatsappMessage(order: {
  orderNumber: string;
  customerName: string;
  total: MoneyInput;
  currency: string;
  paymentMethod: PaymentMethod;
  locale: string;
}): string {
  const firstName = order.customerName.trim().split(/\s+/)[0] ?? order.customerName;
  if (order.locale === "ar") {
    const total = formatMoney(order.total, order.currency, "ar");
    const pay =
      order.paymentMethod === "CASH_ON_DELIVERY"
        ? "الدفع عند الاستلام."
        : "سنرسل لكِ تفاصيل الدفع في الرسالة التالية.";
    return `مرحبًا ${firstName}، تم تأكيد طلبك ${order.orderNumber} من زينة المقري. المبلغ الإجمالي شاملًا الشحن: ${total}. ${pay}`;
  }
  const total = formatMoney(order.total, order.currency, "en");
  const pay =
    order.paymentMethod === "CASH_ON_DELIVERY"
      ? "You will pay on delivery."
      : "We will send the payment details in our next message.";
  return `Hello ${firstName}, your Zina Al Mokri order ${order.orderNumber} is confirmed. Total including shipping: ${total}. ${pay}`;
}

export function whatsappLink(phone: string, message: string): string | null {
  const number = whatsappNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}
