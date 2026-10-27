import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import {
  buttonClass,
  EmptyState,
  inputClass,
  PageHeader,
  StatusBadge,
  tableClass,
} from "@/components/admin/ui";
import { LocalTime } from "@/components/LocalTime";
import { requireAdmin } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import {
  ORDER_STATUSES,
  type OrderStatus,
  PAYMENT_LABELS,
  PAYMENT_METHODS,
  type PaymentMethod,
  STATUS_LABELS,
} from "@/lib/orders/workflow";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Orders" };

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryName = (code: string) => {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};

type Search = { status?: string; q?: string; country?: string; payment?: string };

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const params = (await searchParams) as Search;
  const status = ORDER_STATUSES.includes(params.status as OrderStatus)
    ? (params.status as OrderStatus)
    : undefined;
  const payment = PAYMENT_METHODS.includes(params.payment as PaymentMethod)
    ? (params.payment as PaymentMethod)
    : undefined;
  const country = /^[A-Z]{2}$/.test(params.country ?? "") ? params.country : undefined;
  const q = (params.q ?? "").trim().slice(0, 80);

  const filters: Prisma.OrderWhereInput = {
    ...(payment ? { paymentMethod: payment } : {}),
    ...(country ? { country } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" } },
            { customerName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q.replace(/[^\d+]/g, "") || q } },
          ],
        }
      : {}),
  };

  const [orders, counts, countries] = await Promise.all([
    prisma.order.findMany({
      where: { ...filters, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.order.groupBy({ by: ["status"], where: filters, _count: { _all: true } }),
    prisma.order.findMany({
      distinct: ["country"],
      select: { country: true },
      orderBy: { country: "asc" },
    }),
  ]);

  const countOf = (s?: OrderStatus) =>
    counts.filter((row) => !s || row.status === s).reduce((sum, row) => sum + row._count._all, 0);

  const tabHref = (s?: OrderStatus) => {
    const next = new URLSearchParams();
    if (s) next.set("status", s);
    if (q) next.set("q", q);
    if (country) next.set("country", country);
    if (payment) next.set("payment", payment);
    const query = next.toString();
    return query ? `/admin/orders?${query}` : "/admin/orders";
  };

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Sales"
        title="Orders"
        description="Review each order, set its shipping fee, then approve it. The customer is told the final total."
      />

      <nav aria-label="Order status" className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
        <ul className="flex min-w-max gap-1 border-b border-sand-200">
          {[undefined, ...ORDER_STATUSES].map((s) => {
            const active = s === status;
            return (
              <li key={s ?? "all"}>
                <Link
                  href={tabHref(s)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "-mb-px flex items-center gap-2 border-b px-3 py-3 text-sm transition-colors",
                    active
                      ? "border-mocha text-mocha"
                      : "border-transparent text-sand-700 hover:text-mocha",
                  )}
                >
                  {s ? STATUS_LABELS[s] : "All"}
                  <span
                    className={cn("text-xs tabular-nums", active ? "text-mocha" : "text-sand-700")}
                  >
                    {countOf(s)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form className="grid gap-3 md:grid-cols-[1fr_13rem_13rem_auto]" role="search">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <label className="sr-only" htmlFor="q">
          Search orders
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Order number, name, email or phone"
          className={inputClass}
        />
        <label className="sr-only" htmlFor="country">
          Country
        </label>
        <select id="country" name="country" defaultValue={country ?? ""} className={inputClass}>
          <option value="">All countries</option>
          {countries.map(({ country: code }) => (
            <option key={code} value={code}>
              {countryName(code)}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="payment">
          Payment
        </label>
        <select id="payment" name="payment" defaultValue={payment ?? ""} className={inputClass}>
          <option value="">Any payment</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {PAYMENT_LABELS[method]}
            </option>
          ))}
        </select>
        <button type="submit" className={buttonClass.secondary}>
          Search
        </button>
      </form>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders here"
          body={
            q || country || payment
              ? "Nothing matches these filters."
              : "When customers order, their orders appear here for review."
          }
          action={
            q || country || payment ? (
              <Link href={tabHref(status)} className={buttonClass.quiet}>
                Clear filters
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto border border-sand-200 bg-white">
          <table className={tableClass.table}>
            <thead className={tableClass.head}>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Customer</th>
                <th scope="col" className="hidden md:table-cell">
                  Country
                </th>
                <th scope="col" className="hidden md:table-cell">
                  Payment
                </th>
                <th scope="col" className="hidden sm:table-cell">
                  Status
                </th>
                <th scope="col" className="text-end">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className={tableClass.row}>
                  <td>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="flex flex-col whitespace-nowrap"
                    >
                      <span className="font-medium text-mocha underline-offset-4 hover:underline">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs text-sand-700">
                        <LocalTime
                          value={order.createdAt.toISOString()}
                          options={{ day: "numeric", month: "short", year: "numeric" }}
                          utcLabel={false}
                        />
                      </span>
                    </Link>
                    {/* On phones the status rides under the order number. */}
                    <span className="mt-2 block sm:hidden">
                      <StatusBadge status={order.status} />
                    </span>
                  </td>
                  <td>
                    <bdi className="block">{order.customerName}</bdi>
                    <span className="hidden text-xs text-sand-700 sm:block">{order.email}</span>
                  </td>
                  <td className="hidden text-sand-700 md:table-cell">
                    {countryName(order.country)}
                  </td>
                  <td className="hidden text-sand-700 md:table-cell">
                    {PAYMENT_LABELS[order.paymentMethod]}
                  </td>
                  <td className="hidden sm:table-cell">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="text-end whitespace-nowrap tabular-nums">
                    {order.total ? (
                      formatMoney(order.total, order.currency)
                    ) : (
                      <span className="text-sand-700">
                        {formatMoney(order.subtotal, order.currency)}
                        <span className="block text-xs">+ shipping</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
