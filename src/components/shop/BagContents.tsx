"use client";

import { useLocale, useTranslations } from "next-intl";
import { SmartImage } from "@/components/media/SmartImage";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { bagIdsKey, useBagStore } from "@/lib/shop/bag-store";
import { displayPrice } from "@/lib/shop/format";
import { MAX_QUANTITY } from "@/lib/shop/pricing";
import { QuantityStepper } from "./QuantityStepper";

/**
 * The bag's lines and summary, shared by the drawer and the /cart page. Names and prices are
 * the server's (BagProvider); this component only owns quantities.
 */
export function BagContents({
  variant,
  onNavigate,
}: {
  variant: "drawer" | "page";
  onNavigate?: () => void;
}) {
  const t = useTranslations("Bag");
  const locale = useLocale();
  const lines = useBagStore((s) => s.lines);
  const products = useBagStore((s) => s.products);
  const hydrated = useBagStore((s) => s.hydrated);
  const resolvedIds = useBagStore((s) => s.resolvedIds);
  const removedCount = useBagStore((s) => s.removedCount);
  const setQuantity = useBagStore((s) => s.setQuantity);
  const remove = useBagStore((s) => s.remove);
  const dismissNotice = useBagStore((s) => s.dismissNotice);

  const loading = !hydrated || (lines.length > 0 && resolvedIds !== bagIdsKey(lines));
  const priced = lines.flatMap((line) => {
    const product = products[line.productId];
    return product ? [{ line, product }] : [];
  });
  const currency = priced[0]?.product.currency ?? "USD";
  const subtotalCents = priced.reduce(
    (sum, { line, product }) => sum + product.priceCents * line.quantity,
    0,
  );

  const notice =
    removedCount > 0 ? (
      <div
        role="status"
        className="flex items-start justify-between gap-4 border border-sand-200 bg-sand-100 px-4 py-3 text-sm text-mocha"
      >
        <p>{t("removed", { count: removedCount })}</p>
        <button type="button" onClick={dismissNotice} className="shrink-0 text-sand-700 underline">
          {t("dismiss")}
        </button>
      </div>
    ) : null;

  if (hydrated && lines.length === 0) {
    return (
      <div className={cn("flex flex-col gap-8", variant === "drawer" && "px-6 pt-10 sm:px-8")}>
        {notice}
        <div className={cn(variant === "page" && "py-16 text-center")}>
          <p className="font-display text-h3 text-mocha">{t("empty")}</p>
          <p className="mt-3 text-sand-700">{t("emptyBody")}</p>
          <Link
            href="/products"
            onClick={onNavigate}
            className="label mt-8 inline-block border-b border-mocha pb-1 text-mocha"
          >
            {t("browse")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col",
        variant === "drawer" ? "min-h-0 flex-1" : "gap-10 lg:grid lg:grid-cols-12 lg:gap-12",
      )}
    >
      <div
        className={cn(
          variant === "drawer" ? "min-h-0 flex-1 overflow-y-auto px-6 sm:px-8" : "lg:col-span-8",
        )}
        data-lenis-prevent
      >
        {notice ? <div className="pt-4">{notice}</div> : null}
        <ul aria-busy={loading} className="divide-y divide-sand-200">
          {lines.map((line) => {
            const product = products[line.productId];
            if (!product) {
              return (
                <li key={line.productId} aria-hidden className="flex gap-5 py-6">
                  <div className="aspect-[4/5] w-20 animate-pulse bg-sand-100" />
                  <div className="flex-1 space-y-3 pt-1">
                    <div className="h-3 w-1/3 animate-pulse bg-sand-100" />
                    <div className="h-4 w-2/3 animate-pulse bg-sand-100" />
                  </div>
                </li>
              );
            }
            const max = Math.min(MAX_QUANTITY, product.stock ?? MAX_QUANTITY);
            return (
              <li key={line.productId} className="flex gap-5 py-6">
                <Link
                  href={`/products/${product.slug}`}
                  onClick={onNavigate}
                  tabIndex={-1}
                  aria-hidden
                  className={cn(
                    "relative aspect-[4/5] shrink-0 overflow-hidden bg-sand-100",
                    variant === "drawer" ? "w-20" : "w-24 sm:w-32",
                  )}
                >
                  {product.image ? (
                    <SmartImage
                      asset={product.image.asset}
                      alt=""
                      sizes="128px"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : null}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="label text-sand-700" lang="en" dir="ltr">
                        {product.brand}
                      </p>
                      <Link
                        href={`/products/${product.slug}`}
                        onClick={onNavigate}
                        className="mt-1.5 block font-display text-[1.35rem] leading-tight text-mocha hover:underline hover:underline-offset-4"
                      >
                        {product.name}
                      </Link>
                    </div>
                    <p className="shrink-0 font-latin-display text-lg text-mocha lining-nums">
                      {displayPrice(product.priceCents * line.quantity, product.currency, locale)}
                    </p>
                  </div>
                  {line.quantity > 1 ? (
                    <p className="mt-1 text-xs text-sand-700">
                      {t("each", {
                        price: displayPrice(product.priceCents, product.currency, locale),
                      })}
                    </p>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between gap-4 pt-4">
                    <QuantityStepper
                      size="sm"
                      value={line.quantity}
                      max={max}
                      onChange={(value) => setQuantity(line.productId, Math.min(value, max))}
                      label={product.name}
                    />
                    <button
                      type="button"
                      onClick={() => remove(line.productId)}
                      aria-label={t("removeItem", { name: product.name })}
                      className="text-sm text-sand-700 underline-offset-4 hover:text-mocha hover:underline"
                    >
                      {t("remove")}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div
        className={cn(
          variant === "drawer"
            ? "border-t border-sand-200 bg-white px-6 pt-6 pb-8 sm:px-8"
            : "self-start border border-sand-200 p-8 lg:sticky lg:top-10 lg:col-span-4",
        )}
      >
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex items-baseline justify-between gap-6">
            <dt className="text-sand-700">{t("subtotal")}</dt>
            <dd className="font-latin-display text-h3 leading-none text-mocha lining-nums">
              {loading && priced.length === 0 ? "…" : displayPrice(subtotalCents, currency, locale)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-6">
            <dt className="text-sand-700">{t("shipping")}</dt>
            <dd className="text-mocha">{t("shippingTbc")}</dd>
          </div>
        </dl>
        <Link
          href="/checkout"
          onClick={onNavigate}
          aria-disabled={loading}
          className={cn(
            "mt-6 flex min-h-12 items-center justify-center rounded-full bg-mocha px-8 py-3.5 text-sm tracking-[0.04em] text-white transition-colors duration-500 ease-luxe hover:bg-mocha-800",
            loading && "pointer-events-none opacity-60",
          )}
        >
          {t("checkout")}
        </Link>
        {variant === "drawer" ? (
          <Link
            href="/cart"
            onClick={onNavigate}
            className="mt-4 block text-center text-sm text-sand-700 underline-offset-4 hover:text-mocha hover:underline"
          >
            {t("viewBag")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
