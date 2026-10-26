"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { buttonClass, errorProps, Field, FormMessage, inputClass } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/schemas";
import type { OrderStatus } from "@/lib/orders/workflow";
import {
  approveOrderAction,
  cancelOrderAction,
  markDeliveredAction,
  markPaidAction,
  markShippedAction,
  setShippingFeeAction,
} from "../actions";

type WorkflowOrder = {
  id: string;
  status: OrderStatus;
  shippingFee: string;
  currency: string;
  approvalTarget: OrderStatus;
  trackingNumber: string;
  carrier: string;
};

/** Shows only the actions that are legal for the order's current status. */
export function OrderWorkflow({ order }: { order: WorkflowOrder }) {
  const [feeState, feeAction] = useActionState<ActionState, FormData>(setShippingFeeAction, {});
  const [approveState, approveAction] = useActionState<ActionState, FormData>(
    approveOrderAction,
    {},
  );
  const [paidState, paidAction] = useActionState<ActionState, FormData>(markPaidAction, {});
  const [shipState, shipAction] = useActionState<ActionState, FormData>(markShippedAction, {});
  const [deliverState, deliverAction] = useActionState<ActionState, FormData>(
    markDeliveredAction,
    {},
  );
  const [cancelState, cancelAction] = useActionState<ActionState, FormData>(cancelOrderAction, {});
  const hidden = <input type="hidden" name="orderId" value={order.id} />;
  const canCancel = ["PENDING_REVIEW", "AWAITING_PAYMENT", "APPROVED"].includes(order.status);

  return (
    <div className="flex flex-col gap-8">
      {order.status === "PENDING_REVIEW" ? (
        <>
          <form action={feeAction} className="flex flex-col gap-3" noValidate>
            {hidden}
            <Field
              label={`Shipping fee (${order.currency})`}
              htmlFor="shippingFee"
              hint="Required before approval. The customer's total is subtotal + shipping."
              errors={feeState.errors?.shippingFee}
            >
              <div className="flex gap-2">
                <input
                  id="shippingFee"
                  name="shippingFee"
                  inputMode="decimal"
                  placeholder="0.00"
                  defaultValue={feeState.values?.shippingFee ?? order.shippingFee}
                  className={inputClass}
                  {...errorProps("shippingFee", feeState.errors?.shippingFee)}
                />
                <SubmitButton variant="secondary">Save</SubmitButton>
              </div>
            </Field>
            {/* Field errors render inline; only general messages show here. */}
            <FormMessage state={feeState.errors ? {} : feeState} />
          </form>

          <form action={approveAction} className="flex flex-col gap-3">
            {hidden}
            <FormMessage state={approveState} />
            <SubmitButton pendingLabel="Approving…" disabled={!order.shippingFee}>
              {order.approvalTarget === "APPROVED"
                ? "Approve (cash on delivery)"
                : "Approve and request payment"}
            </SubmitButton>
            {!order.shippingFee ? (
              <p className="text-xs text-sand-700">Set the shipping fee to enable approval.</p>
            ) : null}
          </form>
        </>
      ) : null}

      {order.status === "AWAITING_PAYMENT" ? (
        <form action={paidAction} className="flex flex-col gap-3">
          {hidden}
          <p className="text-sm text-sand-700">
            Waiting for the customer to pay by card or WhatsApp.
          </p>
          <FormMessage state={paidState} />
          <SubmitButton pendingLabel="Saving…">Mark as paid</SubmitButton>
        </form>
      ) : null}

      {order.status === "APPROVED" ? (
        <form action={shipAction} className="flex flex-col gap-4" noValidate>
          {hidden}
          <FormMessage state={shipState} />
          <Field
            label="Carrier"
            htmlFor="carrier"
            hint="Optional, e.g. DHL Express."
            errors={shipState.errors?.carrier}
          >
            <input
              id="carrier"
              name="carrier"
              defaultValue={shipState.values?.carrier ?? order.carrier}
              className={inputClass}
              {...errorProps("carrier", shipState.errors?.carrier)}
            />
          </Field>
          <Field
            label="Tracking number"
            htmlFor="trackingNumber"
            hint="Optional."
            errors={shipState.errors?.trackingNumber}
          >
            <input
              id="trackingNumber"
              name="trackingNumber"
              defaultValue={shipState.values?.trackingNumber ?? order.trackingNumber}
              className={inputClass}
              {...errorProps("trackingNumber", shipState.errors?.trackingNumber)}
            />
          </Field>
          <SubmitButton pendingLabel="Saving…">Mark as shipped</SubmitButton>
        </form>
      ) : null}

      {order.status === "SHIPPED" ? (
        <form action={deliverAction} className="flex flex-col gap-3">
          {hidden}
          <FormMessage state={deliverState} />
          <SubmitButton pendingLabel="Saving…">Mark as delivered</SubmitButton>
        </form>
      ) : null}

      {order.status === "DELIVERED" ? (
        <p className="text-sm text-sand-700">Delivered. Nothing left to do.</p>
      ) : null}
      {order.status === "CANCELLED" ? (
        <p className="text-sm text-sand-700">This order was cancelled.</p>
      ) : null}

      {canCancel ? (
        <form action={cancelAction} className="border-t border-sand-200 pt-6" noValidate>
          {hidden}
          <details open={Boolean(cancelState.errors || (cancelState.message && !cancelState.ok))}>
            <summary className={buttonClass.quiet}>Cancel this order</summary>
            <div className="mt-4 flex flex-col gap-3">
              <FormMessage state={cancelState.errors ? {} : cancelState} />
              <Field
                label="Reason"
                htmlFor="reason"
                hint="Recorded in the timeline."
                errors={cancelState.errors?.reason}
              >
                <textarea
                  id="reason"
                  name="reason"
                  rows={3}
                  defaultValue={cancelState.values?.reason}
                  className={inputClass}
                  {...errorProps("reason", cancelState.errors?.reason)}
                />
              </Field>
              <SubmitButton variant="secondary" pendingLabel="Cancelling…">
                Cancel order
              </SubmitButton>
            </div>
          </details>
        </form>
      ) : null}
    </div>
  );
}
