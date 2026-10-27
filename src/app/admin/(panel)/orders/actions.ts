"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import {
  type ActionState,
  cancelSchema,
  fieldErrors,
  paymentUrlSchema,
  shippedSchema,
  shippingFeeSchema,
} from "@/lib/admin/schemas";
import { requireAdmin } from "@/lib/auth/session";
import { notifyOrderApproved, notifyOrderShipped, notifyPaymentLink } from "@/lib/email/notify";
import { computeTotal, formatMoney, fromCents, parseAmount } from "@/lib/money";
import {
  assertTransition,
  canEditShippingFee,
  type OrderStatus,
  planApproval,
  TransitionError,
} from "@/lib/orders/workflow";
import { prisma } from "@/lib/prisma";

const CONFLICT = "This order changed in the meantime. Reload to see its current state.";

function refresh(orderId: string) {
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

/**
 * Moves an order to `to` inside a transaction: the transition must be legal, the row is updated
 * only if it is still in the status we read (no double transitions), and the change is logged.
 */
async function transition(
  orderId: string,
  to: OrderStatus,
  adminId: string,
  options: { note?: string; data?: Prisma.OrderUpdateManyMutationInput } = {},
): Promise<ActionState> {
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, select: { status: true } });
      if (!order) throw new TransitionError("This order no longer exists.");
      assertTransition(order.status, to);
      const { count } = await tx.order.updateMany({
        where: { id: orderId, status: order.status },
        data: { ...options.data, status: to },
      });
      if (count !== 1) throw new TransitionError(CONFLICT);
      await tx.orderEvent.create({
        data: { orderId, fromStatus: order.status, toStatus: to, note: options.note, adminId },
      });
    });
  } catch (error) {
    if (error instanceof TransitionError) return { ok: false, message: error.message };
    throw error;
  }
  refresh(orderId);
  return { ok: true };
}

export async function setShippingFeeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const parsed = shippingFeeSchema.safeParse({ shippingFee: formData.get("shippingFee") ?? "" });
  if (!parsed.success) return fieldErrors(parsed.error, formData);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, message: "This order no longer exists." };
  if (!canEditShippingFee(order.status)) {
    return { ok: false, message: "The shipping fee is locked once an order is approved." };
  }

  const fee = fromCents(parseAmount(parsed.data.shippingFee)!);
  const total = fromCents(computeTotal(order.subtotal, fee));
  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { shippingFee: fee, total } }),
    prisma.orderEvent.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: order.status,
        adminId: admin.id,
        note: `Shipping fee set to ${formatMoney(fee, order.currency)}. Total ${formatMoney(total, order.currency)}.`,
      },
    }),
  ]);
  refresh(orderId);
  return { ok: true, message: "Shipping fee saved." };
}

export async function approveOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, message: "This order no longer exists." };

  let target: OrderStatus;
  try {
    target = planApproval(order);
  } catch (error) {
    if (error instanceof TransitionError) return { ok: false, message: error.message };
    throw error;
  }
  const total = fromCents(computeTotal(order.subtotal, order.shippingFee));
  const result = await transition(orderId, target, admin.id, {
    note:
      target === "APPROVED"
        ? "Approved for cash on delivery."
        : "Approved. Waiting for the customer's payment.",
    data: { approvedAt: new Date(), total },
  });
  // The customer hears about it once the change is committed.
  if (result.ok) after(() => notifyOrderApproved(orderId));
  return result;
}

/** Card orders: the secure payment link the customer sees on their order page and by email. */
export async function setPaymentUrlAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const parsed = paymentUrlSchema.safeParse({ paymentUrl: formData.get("paymentUrl") ?? "" });
  if (!parsed.success) return fieldErrors(parsed.error, formData);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, paymentMethod: true, paidAt: true, paymentUrl: true },
  });
  if (!order) return { ok: false, message: "This order no longer exists." };
  if (order.paymentMethod !== "CARD") {
    return { ok: false, message: "Payment links are only for card orders." };
  }
  if (order.paidAt || !["PENDING_REVIEW", "AWAITING_PAYMENT"].includes(order.status)) {
    return { ok: false, message: "The payment link is locked once the order is paid." };
  }
  const paymentUrl = parsed.data.paymentUrl;
  if (paymentUrl === order.paymentUrl) return { ok: true, message: "No changes." };

  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { paymentUrl } }),
    prisma.orderEvent.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: order.status,
        adminId: admin.id,
        note: paymentUrl ? "Payment link saved." : "Payment link removed.",
      },
    }),
  ]);
  // Already approved: send the link now. Before approval it goes out with the approval email.
  if (paymentUrl && order.status === "AWAITING_PAYMENT") after(() => notifyPaymentLink(orderId));
  refresh(orderId);
  return {
    ok: true,
    message:
      paymentUrl && order.status === "AWAITING_PAYMENT"
        ? "Payment link saved and sent to the customer."
        : "Payment link saved.",
  };
}

export async function markPaidAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  return transition(String(formData.get("orderId") ?? ""), "APPROVED", admin.id, {
    note: "Payment received.",
    data: { paidAt: new Date() },
  });
}

export async function markShippedAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = shippedSchema.safeParse({
    trackingNumber: formData.get("trackingNumber") ?? "",
    carrier: formData.get("carrier") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error, formData);
  const { trackingNumber, carrier } = parsed.data;
  const note = [carrier && `Carrier: ${carrier}`, trackingNumber && `Tracking: ${trackingNumber}`]
    .filter(Boolean)
    .join(" · ");
  const orderId = String(formData.get("orderId") ?? "");
  const result = await transition(orderId, "SHIPPED", admin.id, {
    note: note || "Shipped.",
    data: { trackingNumber, carrier },
  });
  if (result.ok) after(() => notifyOrderShipped(orderId));
  return result;
}

export async function markDeliveredAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  return transition(String(formData.get("orderId") ?? ""), "DELIVERED", admin.id, {
    note: "Delivered.",
  });
}

export async function cancelOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = cancelSchema.safeParse({ reason: formData.get("reason") ?? "" });
  if (!parsed.success) return fieldErrors(parsed.error, formData);
  return transition(String(formData.get("orderId") ?? ""), "CANCELLED", admin.id, {
    note: parsed.data.reason,
    data: { cancelReason: parsed.data.reason },
  });
}
