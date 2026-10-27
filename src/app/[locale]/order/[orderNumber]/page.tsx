import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { fromCents, toCents } from "@/lib/money";
import { customerTimeline } from "@/lib/orders/customer-timeline";
import { isOrderNumber } from "@/lib/orders/number";
import { tokensMatch } from "@/lib/orders/token";
import { prisma } from "@/lib/prisma";
import { countryName } from "@/lib/shop/countries";
import { displayPrice } from "@/lib/shop/format";
import { businessWhatsappLink, checkoutWhatsappMessage } from "@/lib/shop/whatsapp";
import { absoluteUrl, trackingPath } from "@/lib/site-url";

/**
 * The customer's private order page. Always rendered per request (fresh status) and only with
 * the matching secret token, compared in constant time; anything else is a real 404 before any
 * byte is streamed.
 */
export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/order/[orderNumber]">): Promise<Metadata> {
  const { orderNumber } = await params;
  const t = await getTranslations("Order");
  return {
    title: t("title", { number: decodeURIComponent(orderNumber) }),
    robots: { index: false, follow: false },
    // The page URL carries the private token: never send it to other sites.
    referrer: "no-referrer",
  };
}

type Params = { locale: Locale; orderNumber: string };

export default async function OrderPage({
  params,
  searchParams,
}: PageProps<"/[locale]/order/[orderNumber]">) {
  const { locale, orderNumber: rawNumber } = (await params) as Params;
  const { t: token } = (await searchParams) as { t?: string | string[] };
  const orderNumber = decodeURIComponent(rawNumber);
  if (!isOrderNumber(orderNumber) || typeof token !== "string") notFound();

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: { product: { select: { nameEn: true, nameAr: true, slug: true } } },
      },
      events: {
        orderBy: { createdAt: "asc" },
        select: { fromStatus: true, toStatus: true, createdAt: true },
      },
    },
  });
  if (!order || !tokensMatch(order.publicToken, token)) notFound();

  const t = await getTranslations("Order");
  const tc = await getTranslations("Checkout");
  const money = (value: { toString(): string }) =>
    displayPrice(toCents(value), order.currency, locale);
  const date = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, { dateStyle: "long" });
  const dateTime = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const timeline = customerTimeline(order, order.events);
  const itemName = (item: (typeof order.items)[number]) =>
    (locale === "ar" ? item.product.nameAr : item.product.nameEn) || item.productNameSnapshot;

  const canPay =
    order.paymentMethod === "CARD" &&
    order.status === "AWAITING_PAYMENT" &&
    !order.paidAt &&
    order.paymentUrl?.startsWith("https://");
  const whatsapp =
    order.paymentMethod === "WHATSAPP" &&
    (order.status === "PENDING_REVIEW" || order.status === "AWAITING_PAYMENT")
      ? businessWhatsappLink(
          checkoutWhatsappMessage({
            locale,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            items: order.items.map((item) => ({ name: itemName(item), quantity: item.quantity })),
            subtotal: order.subtotal,
            currency: order.currency,
            trackingUrl: absoluteUrl(trackingPath(locale, order.orderNumber, token)),
          }),
        )
      : null;

  return (
    <main id="main" className="mx-auto w-full max-w-[80rem] flex-1 px-gutter pt-10 pb-section">
      <header className="flex flex-col gap-6 border-b border-sand-200 pb-12 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="label text-sand-700">{t("overline")}</p>
          <h1 className="mt-5 text-h1 text-mocha lining-nums">
            {t("title", { number: order.orderNumber })}
          </h1>
          <p className="mt-4 text-sm text-sand-700">
            {t("placedOn", { date: date.format(order.createdAt) })}
          </p>
        </div>
        <p
          className={cn(
            "label self-start rounded-full border px-5 py-2.5 md:self-auto",
            order.status === "CANCELLED"
              ? "border-sand-200 text-sand-700"
              : "border-mocha bg-mocha text-white",
          )}
        >
          {t(`statuses.${order.status}`)}
        </p>
      </header>

      {order.status === "PENDING_REVIEW" ? (
        <p className="mt-10 max-w-[56ch] text-lead text-mocha">{t("intro")}</p>
      ) : null}
      {order.status === "CANCELLED" ? (
        <p className="mt-10 max-w-[56ch] text-lead text-mocha">{t("cancelledBody")}</p>
      ) : null}

      {canPay ? (
        <section className="mt-10 flex flex-col gap-6 bg-mocha px-8 py-10 text-white md:flex-row md:items-center md:justify-between md:px-12">
          <div>
            <p className="font-display text-h3">{t("paySecurely")}</p>
            <p className="mt-2 max-w-[48ch] text-sand-100">{t("payBody")}</p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <p className="font-latin-display text-h2 leading-none lining-nums">
              {order.total ? money(order.total) : ""}
            </p>
            <a
              href={order.paymentUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center gap-3 rounded-full bg-white px-8 py-3.5 text-sm tracking-[0.04em] text-mocha transition-colors duration-500 hover:bg-sand-100"
            >
              <svg aria-hidden viewBox="0 0 16 16" className="size-3.5">
                <rect x="3" y="7" width="10" height="7" rx="1" fill="none" stroke="currentColor" />
                <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" />
              </svg>
              {t("paySecurely")}
            </a>
          </div>
        </section>
      ) : null}

      {whatsapp ? (
        <section className="mt-10 flex flex-col gap-5 border border-sand-200 px-8 py-8 md:flex-row md:items-center md:justify-between">
          <p className="max-w-[52ch] text-mocha">{t("whatsappBody")}</p>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-mocha px-8 py-3.5 text-sm text-white transition-colors hover:bg-mocha-800"
          >
            {t("continueWhatsapp")}
          </a>
        </section>
      ) : null}

      <div className="mt-16 grid gap-16 lg:grid-cols-12">
        <section aria-labelledby="timeline-title" className="lg:col-span-5">
          <h2 id="timeline-title" className="label text-sand-700">
            {t("timeline")}
          </h2>
          <ol className="relative mt-8 flex flex-col">
            {timeline.map((entry, index) => {
              const last = index === timeline.length - 1;
              const current = entry.kind === "done" && timeline[index + 1]?.kind !== "done";
              return (
                <li
                  key={`${entry.kind}-${entry.key}-${index}`}
                  className="relative flex gap-6 pb-9"
                >
                  {!last ? (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute start-[0.4375rem] top-5 -bottom-1 w-px",
                        entry.kind === "done" && timeline[index + 1]?.kind === "done"
                          ? "bg-mocha"
                          : "bg-sand-200",
                      )}
                    />
                  ) : null}
                  <span
                    aria-hidden
                    className={cn(
                      "relative mt-1.5 grid size-3.5 shrink-0 place-items-center rounded-full border",
                      entry.kind === "done" ? "border-mocha bg-mocha" : "border-sand bg-white",
                      current && "ring-4 ring-sand-200",
                    )}
                  />
                  <div>
                    <p
                      className={cn(
                        "text-lead leading-snug",
                        entry.kind === "done" ? "text-mocha" : "text-sand-700",
                      )}
                    >
                      {entry.kind === "done"
                        ? t(`events.${entry.key}`)
                        : t(`upcoming.${entry.key}`)}
                    </p>
                    {entry.kind === "done" ? (
                      <p className="mt-1 text-sm text-sand-700">
                        <time dateTime={entry.at.toISOString()}>{dateTime.format(entry.at)}</time>
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>

          {(order.status === "SHIPPED" || order.status === "DELIVERED") &&
          (order.carrier || order.trackingNumber) ? (
            <dl className="mt-2 grid grid-cols-2 gap-6 border-t border-sand-200 pt-8">
              {order.carrier ? (
                <div>
                  <dt className="label text-sand-700">{t("carrier")}</dt>
                  <dd className="mt-2 text-mocha">{order.carrier}</dd>
                </div>
              ) : null}
              {order.trackingNumber ? (
                <div>
                  <dt className="label text-sand-700">{t("trackingNumber")}</dt>
                  <dd className="mt-2 font-latin-display text-lg text-mocha lining-nums" dir="ltr">
                    {order.trackingNumber}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </section>

        <section
          aria-labelledby="items-title"
          className="self-start border border-sand-200 p-6 sm:p-8 lg:col-span-6 lg:col-start-7"
        >
          <h2 id="items-title" className="font-display text-h3 text-mocha">
            {t("items")}
          </h2>
          <ul className="mt-6 divide-y divide-sand-200 border-y border-sand-200">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-6 py-4">
                <div>
                  <p className="text-mocha">{itemName(item)}</p>
                  <p className="mt-1 text-sm text-sand-700">
                    {t("quantity", { count: item.quantity })}
                  </p>
                </div>
                <p className="font-latin-display text-lg text-mocha lining-nums">
                  {money(fromCents(toCents(item.unitPrice) * item.quantity))}
                </p>
              </li>
            ))}
          </ul>
          <dl className="mt-6 flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-6">
              <dt className="text-sand-700">{t("subtotal")}</dt>
              <dd className="font-latin-display text-lg text-mocha lining-nums">
                {money(order.subtotal)}
              </dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-sand-700">{t("shipping")}</dt>
              <dd className="text-mocha">
                {order.shippingFee !== null ? (
                  <span className="font-latin-display text-lg lining-nums">
                    {money(order.shippingFee)}
                  </span>
                ) : (
                  t("shippingTbc")
                )}
              </dd>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-6 border-t border-sand-200 pt-4">
              <dt className="label text-mocha">{t("total")}</dt>
              <dd className="text-mocha">
                {order.total !== null ? (
                  <span className="font-latin-display text-h3 leading-none lining-nums">
                    {money(order.total)}
                  </span>
                ) : (
                  t("totalTbc")
                )}
              </dd>
            </div>
          </dl>
          <dl className="mt-8 grid gap-6 border-t border-sand-200 pt-6 text-sm sm:grid-cols-2">
            <div>
              <dt className="label text-sand-700">{t("paymentMethod")}</dt>
              <dd className="mt-2 text-mocha">
                {tc(`methods.${order.paymentMethod}.title`)}
                {order.paidAt ? <span className="text-sand-700"> · {t("paid")}</span> : null}
              </dd>
            </div>
            <div>
              <dt className="label text-sand-700">{t("shipTo")}</dt>
              <dd className="mt-2 text-mocha">
                {order.city}
                {locale === "ar" ? "، " : ", "}
                {countryName(order.country, locale)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="mt-16 flex flex-col gap-2 border-t border-sand-200 pt-8 text-sm text-sand-700">
        <p>{t("keepLink")}</p>
        <p>{t("help")}</p>
      </div>
    </main>
  );
}
