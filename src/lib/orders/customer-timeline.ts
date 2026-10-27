import type { OrderStatus, PaymentMethod } from "./workflow";

export type CustomerEventKey =
  "placed" | "confirmed" | "approved" | "paid" | "shipped" | "delivered" | "cancelled";
export type UpcomingKey = "review" | "payment" | "shipped" | "delivered";

export type TimelineEntry =
  { kind: "done"; key: CustomerEventKey; at: Date } | { kind: "upcoming"; key: UpcomingKey };

/**
 * The customer's view of an order's history: status changes only, in customer wording, never
 * admin notes or internal edits; followed by the steps still ahead.
 */
export function customerTimeline(
  order: { status: OrderStatus; paymentMethod: PaymentMethod },
  events: ReadonlyArray<{ fromStatus: OrderStatus | null; toStatus: OrderStatus; createdAt: Date }>,
): TimelineEntry[] {
  const done: TimelineEntry[] = [];
  for (const event of events) {
    const key = eventKey(event.fromStatus, event.toStatus);
    if (key) done.push({ kind: "done", key, at: event.createdAt });
  }

  if (order.status === "CANCELLED" || order.status === "DELIVERED") return done;

  const ahead: UpcomingKey[] = [];
  if (order.status === "PENDING_REVIEW") {
    ahead.push("review");
    if (order.paymentMethod !== "CASH_ON_DELIVERY") ahead.push("payment");
  }
  if (order.status === "AWAITING_PAYMENT") ahead.push("payment");
  if (order.status !== "SHIPPED") ahead.push("shipped");
  ahead.push("delivered");

  return [...done, ...ahead.map((key) => ({ kind: "upcoming" as const, key }))];
}

function eventKey(from: OrderStatus | null, to: OrderStatus): CustomerEventKey | null {
  if (from === null) return "placed";
  if (from === to) return null; // shipping fee, payment link and other internal edits
  switch (to) {
    case "AWAITING_PAYMENT":
      return "confirmed";
    case "APPROVED":
      return from === "AWAITING_PAYMENT" ? "paid" : "approved";
    case "SHIPPED":
      return "shipped";
    case "DELIVERED":
      return "delivered";
    case "CANCELLED":
      return "cancelled";
    default:
      return null;
  }
}
