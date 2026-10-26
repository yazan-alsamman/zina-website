import type { Metadata } from "next";
import Link from "next/link";
import {
  ButtonLink,
  EmptyState,
  PageHeader,
  Panel,
  StatusBadge,
  tableClass,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
import { REVENUE_STATUSES } from "@/lib/orders/workflow";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Overview" };

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function DashboardPage() {
  const admin = await requireAdmin();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [pending, awaiting, revenue, published, drafts, latest] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.order.count({ where: { status: "AWAITING_PAYMENT" } }),
    prisma.order.groupBy({
      by: ["currency"],
      where: { status: { in: [...REVENUE_STATUSES] }, approvedAt: { gte: monthStart } },
      _sum: { total: true },
    }),
    prisma.product.count({ where: { isPublished: true } }),
    prisma.product.count({ where: { isPublished: false } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        country: true,
        status: true,
        total: true,
        subtotal: true,
        currency: true,
        createdAt: true,
      },
    }),
  ]);

  const monthName = now.toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
  const revenueLines = revenue
    .filter((row) => row._sum.total)
    .map((row) => formatMoney(row._sum.total!, row.currency));

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Overview"
        title={`Good day, ${admin.name.split(" ")[0]}.`}
        description="What needs your attention today."
      />

      <dl className="grid gap-px border border-sand-200 bg-sand-200 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Pending review"
          value={String(pending)}
          href="/admin/orders?status=PENDING_REVIEW"
          linkLabel="Review orders"
        />
        <Stat
          label="Awaiting payment"
          value={String(awaiting)}
          href="/admin/orders?status=AWAITING_PAYMENT"
          linkLabel="See orders"
        />
        <Stat
          label={`Revenue, ${monthName}`}
          value={revenueLines.length ? revenueLines.join(" · ") : formatMoney(0, "USD")}
          note="Approved, shipped and delivered"
        />
        <Stat
          label="Products"
          value={`${published} published`}
          note={`${drafts} in draft`}
          href="/admin/products"
          linkLabel="Manage products"
        />
      </dl>

      <Panel
        title="Latest orders"
        aside={
          <Link href="/admin/orders" className="text-xs text-sand-700 underline underline-offset-4">
            All orders
          </Link>
        }
      >
        {latest.length === 0 ? (
          <EmptyState
            title="No orders yet"
            body="Orders placed on the site appear here for review. Checkout arrives in the next step."
            action={
              <ButtonLink href="/admin/products/new" variant="secondary">
                Add a product
              </ButtonLink>
            }
          />
        ) : (
          <div className="-mx-6 -my-6 overflow-x-auto">
            <table className={tableClass.table}>
              <thead className={tableClass.head}>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Placed</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {latest.map((order) => (
                  <tr key={order.id} className={tableClass.row}>
                    <td>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-mocha underline-offset-4 hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>
                      <bdi>{order.customerName}</bdi>{" "}
                      <span className="text-sand-700">· {order.country}</span>
                    </td>
                    <td className="text-sand-700">{dateFormat.format(order.createdAt)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="text-end tabular-nums">
                      {order.total ? (
                        formatMoney(order.total, order.currency)
                      ) : (
                        <span className="text-sand-700">
                          {formatMoney(order.subtotal, order.currency)} + shipping
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  href,
  linkLabel,
}: {
  label: string;
  value: string;
  note?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-col bg-white p-6">
      <dt className="label text-sand-700">{label}</dt>
      <dd className="mt-4 font-latin-display text-h2 leading-none font-light text-mocha lining-nums">
        {value}
      </dd>
      {note ? <dd className="mt-2 text-xs text-sand-700">{note}</dd> : null}
      {href ? (
        <dd className="mt-auto pt-5">
          <Link
            href={href}
            className="text-xs text-sand-700 underline decoration-sand-200 underline-offset-4 hover:text-mocha"
          >
            {linkLabel}
          </Link>
        </dd>
      ) : null}
    </div>
  );
}
