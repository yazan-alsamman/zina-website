import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, Panel, StatusBadge, tableClass } from "@/components/admin/ui";
import { LocalTime } from "@/components/LocalTime";
import { requireAdmin } from "@/lib/auth/session";
import { formatMoney, fromCents, toCents } from "@/lib/money";
import {
  approvalTarget,
  PAYMENT_LABELS,
  STATUS_LABELS,
  whatsappLink,
  whatsappMessage,
} from "@/lib/orders/workflow";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, trackingPath } from "@/lib/site-url";
import { CopyLinkButton } from "./CopyLinkButton";
import { OrderWorkflow } from "./OrderWorkflow";

export const metadata: Metadata = { title: "Order" };

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export default async function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { id: "asc" } },
      events: { orderBy: { createdAt: "desc" }, include: { admin: { select: { name: true } } } },
    },
  });
  if (!order) notFound();

  const money = (value: { toString(): string } | number) => formatMoney(value, order.currency);
  // The private tracking link, to paste into a WhatsApp or email reply.
  const customerPage = absoluteUrl(
    trackingPath(order.locale, order.orderNumber, order.publicToken),
  );
  const contact = order.whatsapp || order.phone;
  const waLink = order.total
    ? whatsappLink(contact, whatsappMessage({ ...order, total: order.total }))
    : null;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Order"
        title={order.orderNumber}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <StatusBadge status={order.status} />
            <span>
              Placed <LocalTime value={order.createdAt.toISOString()} />
            </span>
            <span>· {order.locale === "ar" ? "Arabic" : "English"} site</span>
          </span>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-8">
          <Panel title="Items">
            <div className="-mx-6 -my-6 overflow-x-auto">
              <table className={tableClass.table}>
                <thead className={tableClass.head}>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col" className="text-end">
                      Unit price
                    </th>
                    <th scope="col" className="text-end">
                      Qty
                    </th>
                    <th scope="col" className="text-end">
                      Line total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className={tableClass.row}>
                      <td>{item.productNameSnapshot}</td>
                      <td className="text-end tabular-nums">{money(item.unitPrice)}</td>
                      <td className="text-end tabular-nums">{item.quantity}</td>
                      <td className="text-end tabular-nums">
                        {money(fromCents(toCents(item.unitPrice) * item.quantity))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="ms-auto mt-10 flex max-w-xs flex-col gap-2 text-sm">
              <div className="flex justify-between gap-6">
                <dt className="text-sand-700">Subtotal</dt>
                <dd className="tabular-nums">{money(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-sand-700">Shipping</dt>
                <dd className="tabular-nums">
                  {order.shippingFee ? money(order.shippingFee) : "To be set"}
                </dd>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-6 border-t border-sand-200 pt-3">
                <dt className="label text-mocha">Total</dt>
                <dd className="font-latin-display text-h3 lining-nums tabular-nums">
                  {order.total ? money(order.total) : "—"}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Timeline">
            {order.events.length === 0 ? (
              <p className="text-sm text-sand-700">No changes yet.</p>
            ) : (
              <ol className="relative flex flex-col gap-6 border-s border-sand-200 ps-6">
                {order.events.map((event) => (
                  <li key={event.id} className="relative">
                    <span
                      aria-hidden
                      className="absolute -start-[1.72rem] top-1.5 size-2 rounded-full bg-sand"
                    />
                    <p className="text-sm text-mocha">
                      {event.fromStatus === null
                        ? `Placed as ${STATUS_LABELS[event.toStatus]}`
                        : event.fromStatus === event.toStatus
                          ? "Updated"
                          : `${STATUS_LABELS[event.fromStatus]} → ${STATUS_LABELS[event.toStatus]}`}
                    </p>
                    {event.note ? <p className="mt-1 text-sm text-sand-700">{event.note}</p> : null}
                    <p className="mt-1 text-xs text-sand-700">
                      <LocalTime value={event.createdAt.toISOString()} />
                      {event.admin ? ` · ${event.admin.name}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-8">
          <Panel title="Next step">
            <OrderWorkflow
              order={{
                id: order.id,
                status: order.status,
                shippingFee: order.shippingFee ? order.shippingFee.toFixed(2) : "",
                currency: order.currency,
                approvalTarget: approvalTarget(order.paymentMethod),
                trackingNumber: order.trackingNumber ?? "",
                carrier: order.carrier ?? "",
                paymentMethod: order.paymentMethod,
                paymentUrl: order.paymentUrl ?? "",
                paid: order.paidAt !== null,
              }}
            />
          </Panel>

          <Panel title="Customer">
            <dl className="flex flex-col gap-4 text-sm">
              <Item label="Name" value={<bdi>{order.customerName}</bdi>} />
              <Item
                label="Email"
                value={
                  <a href={`mailto:${order.email}`} className="underline underline-offset-4">
                    {order.email}
                  </a>
                }
              />
              <Item
                label="Phone"
                value={
                  <a href={`tel:${order.phone}`} className="underline underline-offset-4">
                    {order.phone}
                  </a>
                }
              />
              {order.whatsapp ? <Item label="WhatsApp" value={order.whatsapp} /> : null}
              <Item
                label="Payment"
                value={
                  order.paidAt ? (
                    <>
                      {PAYMENT_LABELS[order.paymentMethod]} · paid{" "}
                      <LocalTime value={order.paidAt.toISOString()} />
                    </>
                  ) : (
                    PAYMENT_LABELS[order.paymentMethod]
                  )
                }
              />
              <Item
                label="Customer's order page"
                value={
                  <span className="flex flex-wrap items-center gap-3">
                    <a
                      href={customerPage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4"
                    >
                      Open
                    </a>
                    <CopyLinkButton link={customerPage} label="Copy link" variant="quiet" />
                  </span>
                }
              />
              <Item
                label="Address"
                value={
                  <address className="not-italic">
                    {order.addressLine1}
                    {order.addressLine2 ? (
                      <>
                        <br />
                        {order.addressLine2}
                      </>
                    ) : null}
                    <br />
                    {[order.city, order.postalCode].filter(Boolean).join(" ")}
                    <br />
                    {regionNames.of(order.country) ?? order.country}
                  </address>
                }
              />
              {order.trackingNumber || order.carrier ? (
                <Item
                  label="Shipment"
                  value={[order.carrier, order.trackingNumber].filter(Boolean).join(" · ")}
                />
              ) : null}
              {order.notes ? <Item label="Customer notes" value={order.notes} /> : null}
              {order.cancelReason ? (
                <Item label="Cancellation reason" value={order.cancelReason} />
              ) : null}
            </dl>
          </Panel>

          <Panel title="WhatsApp">
            {waLink ? (
              <div className="flex flex-col gap-3 text-sm">
                <p className="text-sand-700">
                  A message in {order.locale === "ar" ? "Arabic" : "English"} with the final total,
                  ready to send.
                </p>
                <div className="flex flex-wrap gap-3">
                  <CopyLinkButton link={waLink} />
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center border border-mocha/25 px-4 py-2 text-sm hover:border-mocha"
                  >
                    Open WhatsApp
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-sand-700">
                {order.total
                  ? "The customer's number is not valid for WhatsApp."
                  : "Available once the shipping fee is set."}
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-sand-700">{label}</dt>
      <dd className="text-mocha">{value}</dd>
    </div>
  );
}
