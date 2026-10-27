"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  type SubmitEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import { type CheckoutState, placeOrderAction } from "@/app/[locale]/checkout/actions";
import { SmartImage } from "@/components/media/SmartImage";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/orders/workflow";
import { bagIdsKey, useBagStore } from "@/lib/shop/bag-store";
import { displayPrice } from "@/lib/shop/format";

type Option = { code: string; label: string };

const field =
  "w-full border-0 border-b border-sand-200 bg-transparent py-3 text-base text-mocha transition-colors duration-300 placeholder:text-sand-700/70 focus:border-mocha focus:outline-none aria-[invalid=true]:border-[#9b4a3c]";

function newKey() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * One-page checkout. Prices shown here are for reading only: the server action recomputes the
 * order from the database and receives nothing but product ids and quantities.
 */
export function CheckoutForm({
  countries,
  phoneCountries,
}: {
  countries: Option[];
  phoneCountries: Option[];
}) {
  const t = useTranslations("Checkout");
  const bag = useTranslations("Bag");
  const locale = useLocale();
  const router = useRouter();
  const [state, action] = useActionState<CheckoutState, FormData>(placeOrderAction, {});

  const lines = useBagStore((s) => s.lines);
  const products = useBagStore((s) => s.products);
  const hydrated = useBagStore((s) => s.hydrated);
  const resolvedIds = useBagStore((s) => s.resolvedIds);
  const replaceLines = useBagStore((s) => s.replace);
  const clearBag = useBagStore((s) => s.clear);

  const [country, setCountry] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("");
  const [phoneCountryTouched, setPhoneCountryTouched] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod | "">("");
  const keyRef = useRef<string | null>(null);
  const keyInput = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const waWindow = useRef<Window | null>(null);
  const handled = useRef<CheckoutState | null>(null);

  // After a successful order the bag empties while we navigate away: no empty-bag flash.
  const leaving = Boolean(state.ok);
  const effectivePhoneCountry = phoneCountryTouched ? phoneCountry : country;
  const errors = state.fieldErrors ?? {};
  const v = (key: string) => state.values?.[key];

  // After a reply: go to the tracking page, or bring the first problem into view.
  useEffect(() => {
    if (handled.current === state) return; // effects can replay (Strict Mode)
    handled.current = state;
    if (state.ok && state.result) {
      const { trackingPath, whatsappUrl } = state.result;
      if (whatsappUrl) {
        if (waWindow.current && !waWindow.current.closed)
          waWindow.current.location.href = whatsappUrl;
        else window.open(whatsappUrl, "_blank", "noopener");
      }
      waWindow.current = null;
      clearBag();
      router.replace(trackingPath);
      return;
    }
    waWindow.current?.close();
    waWindow.current = null;
    if (!state.error) return;
    if (state.unavailable?.length) {
      const gone = new Set(state.unavailable);
      replaceLines(useBagStore.getState().lines.filter((line) => !gone.has(line.productId)));
    }
    const first = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
    (first ?? formRef.current?.querySelector<HTMLElement>("[data-form-message]"))?.focus();
  }, [state, router, clearBag, replaceLines]);

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    keyRef.current ??= newKey();
    if (keyInput.current) keyInput.current.value = keyRef.current;
    // Opened inside the click so pop-up blockers allow it; pointed at wa.me once the order exists.
    if (payment === "WHATSAPP" && !event.defaultPrevented) {
      waWindow.current = window.open("about:blank", "_blank");
      if (waWindow.current) waWindow.current.opener = null;
    }
  };

  const loading = !hydrated || (lines.length > 0 && resolvedIds !== bagIdsKey(lines));
  const priced = lines.flatMap((line) =>
    products[line.productId] ? [{ line, product: products[line.productId] }] : [],
  );
  const currency = priced[0]?.product.currency ?? "USD";
  const subtotal = priced.reduce(
    (sum, { line, product }) => sum + product.priceCents * line.quantity,
    0,
  );

  if (hydrated && lines.length === 0 && !leaving) {
    return (
      <section className="border-t border-sand-200 py-24 text-center">
        <h2 className="text-h2 text-mocha">{t("emptyTitle")}</h2>
        <p className="mx-auto mt-4 max-w-[40ch] text-lead text-sand-700">{t("emptyBody")}</p>
        <Link
          href="/products"
          className="label mt-10 inline-block border-b border-mocha pb-1 text-mocha"
        >
          {bag("browse")}
        </Link>
      </section>
    );
  }

  const error = (name: string) =>
    errors[name] ? (
      <p id={`${name}-error`} className="mt-2 text-sm text-[#9b4a3c]">
        {t(`errors.${errors[name]}`)}
      </p>
    ) : null;
  const describedBy = (name: string, hint?: boolean) =>
    [errors[name] ? `${name}-error` : null, hint ? `${name}-hint` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={onSubmit}
      noValidate
      className="grid gap-14 lg:grid-cols-12 lg:gap-16"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <input ref={keyInput} type="hidden" name="idempotencyKey" defaultValue="" />
      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden className="absolute -start-[9999px] h-px w-px overflow-hidden">
        <label>
          {t("company")}
          <input type="text" name="company" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className="flex flex-col gap-16 lg:col-span-7">
        {state.error && state.error !== "fields" ? (
          <p
            data-form-message
            tabIndex={-1}
            role="alert"
            className="border border-[#9b4a3c]/40 bg-[#9b4a3c]/5 px-5 py-4 text-sm text-mocha"
          >
            {t(`errors.${state.error}`)}
          </p>
        ) : state.error === "fields" ? (
          <p data-form-message tabIndex={-1} role="alert" className="text-sm text-[#9b4a3c]">
            {t("errors.fields")}
          </p>
        ) : null}

        <Section index={1} title={t("contact")}>
          <div className="grid gap-8 sm:grid-cols-2">
            <Field label={t("name")} htmlFor="name" className="sm:col-span-2">
              <input
                id="name"
                name="name"
                autoComplete="name"
                defaultValue={v("name")}
                className={field}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={describedBy("name")}
                required
              />
              {error("name")}
            </Field>
            <Field label={t("email")} htmlFor="email" className="sm:col-span-2">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                dir="ltr"
                defaultValue={v("email")}
                className={cn(field, "rtl:text-end")}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={describedBy("email")}
                required
              />
              {error("email")}
            </Field>
            <Field label={t("phoneCountry")} htmlFor="phoneCountry">
              <select
                id="phoneCountry"
                name="phoneCountry"
                value={effectivePhoneCountry}
                onChange={(event) => {
                  setPhoneCountryTouched(true);
                  setPhoneCountry(event.target.value);
                }}
                autoComplete="tel-country-code"
                className={cn(field, "cursor-pointer")}
                aria-invalid={Boolean(errors.phoneCountry)}
                aria-describedby={describedBy("phoneCountry")}
              >
                <option value="">—</option>
                {phoneCountries.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
              {error("phoneCountry")}
            </Field>
            <Field label={t("phone")} htmlFor="phone">
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                dir="ltr"
                defaultValue={v("phone")}
                className={cn(field, "rtl:text-end")}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={describedBy("phone")}
                required
              />
              {error("phone")}
            </Field>
            <Field
              label={t("whatsapp")}
              htmlFor="whatsapp"
              optional={t("optional")}
              className="sm:col-span-2"
            >
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                inputMode="tel"
                dir="ltr"
                defaultValue={v("whatsapp")}
                className={cn(field, "rtl:text-end")}
                aria-invalid={Boolean(errors.whatsapp)}
                aria-describedby={describedBy("whatsapp", true)}
              />
              <p id="whatsapp-hint" className="mt-2 text-xs text-sand-700">
                {t("whatsappHint")}
              </p>
              {error("whatsapp")}
            </Field>
          </div>
        </Section>

        <Section index={2} title={t("shippingAddress")}>
          <div className="grid gap-8 sm:grid-cols-2">
            <Field label={t("country")} htmlFor="country">
              <select
                id="country"
                name="country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                autoComplete="country"
                className={cn(field, "cursor-pointer")}
                aria-invalid={Boolean(errors.country)}
                aria-describedby={describedBy("country")}
                required
              >
                {/* Not disabled: a disabled placeholder makes browsers show the first country after
                    React resets the form, while the value is still empty. */}
                <option value="">—</option>
                {countries.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
              {error("country")}
            </Field>
            <Field label={t("city")} htmlFor="city">
              <input
                id="city"
                name="city"
                autoComplete="address-level2"
                defaultValue={v("city")}
                className={field}
                aria-invalid={Boolean(errors.city)}
                aria-describedby={describedBy("city")}
                required
              />
              {error("city")}
            </Field>
            <Field label={t("addressLine1")} htmlFor="addressLine1" className="sm:col-span-2">
              <input
                id="addressLine1"
                name="addressLine1"
                autoComplete="address-line1"
                defaultValue={v("addressLine1")}
                className={field}
                aria-invalid={Boolean(errors.addressLine1)}
                aria-describedby={describedBy("addressLine1")}
                required
              />
              {error("addressLine1")}
            </Field>
            <Field label={t("addressLine2")} htmlFor="addressLine2" optional={t("optional")}>
              <input
                id="addressLine2"
                name="addressLine2"
                autoComplete="address-line2"
                defaultValue={v("addressLine2")}
                className={field}
                aria-invalid={Boolean(errors.addressLine2)}
                aria-describedby={describedBy("addressLine2")}
              />
              {error("addressLine2")}
            </Field>
            <Field label={t("postalCode")} htmlFor="postalCode" optional={t("optional")}>
              <input
                id="postalCode"
                name="postalCode"
                autoComplete="postal-code"
                defaultValue={v("postalCode")}
                className={field}
                aria-invalid={Boolean(errors.postalCode)}
                aria-describedby={describedBy("postalCode")}
              />
              {error("postalCode")}
            </Field>
          </div>
        </Section>

        <Section index={3} title={t("payment")}>
          <fieldset aria-describedby={errors.paymentMethod ? "paymentMethod-error" : undefined}>
            <legend className="sr-only">{t("payment")}</legend>
            <div className="grid gap-3">
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method}
                  className={cn(
                    "group flex cursor-pointer items-start gap-5 border px-6 py-5 transition-colors duration-300",
                    payment === method
                      ? "border-mocha bg-sand-100/60"
                      : "border-sand-200 hover:border-sand",
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    checked={payment === method}
                    onChange={() => setPayment(method)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 grid size-4 shrink-0 place-items-center rounded-full border transition-colors peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-4",
                      payment === method ? "border-mocha" : "border-sand",
                    )}
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full bg-mocha transition-transform duration-300",
                        payment === method ? "scale-100" : "scale-0",
                      )}
                    />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="font-display text-[1.35rem] leading-tight text-mocha">
                      {t(`methods.${method}.title`)}
                    </span>
                    <span className="text-sm text-sand-700">{t(`methods.${method}.body`)}</span>
                  </span>
                </label>
              ))}
            </div>
            {error("paymentMethod")}
          </fieldset>
        </Section>

        <Section index={4} title={t("notes")} optional={t("optional")}>
          <label htmlFor="notes" className="sr-only">
            {t("notes")}
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder={t("notesPlaceholder")}
            defaultValue={v("notes")}
            className={cn(field, "resize-y")}
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={describedBy("notes")}
          />
          {error("notes")}
        </Section>
      </div>

      <aside
        aria-labelledby="summary-title"
        className="self-start border border-sand-200 bg-white p-6 sm:p-8 lg:sticky lg:top-10 lg:col-span-5"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="summary-title" className="font-display text-h3 text-mocha">
            {t("summary")}
          </h2>
          <Link href="/cart" className="text-sm text-sand-700 underline-offset-4 hover:underline">
            {t("editBag")}
          </Link>
        </div>

        <ul aria-busy={loading} className="mt-6 divide-y divide-sand-200 border-y border-sand-200">
          {lines.map((line) => {
            const product = products[line.productId];
            return (
              <li key={line.productId} className="flex items-center gap-4 py-4">
                <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden bg-sand-100">
                  {product?.image ? (
                    <SmartImage
                      asset={product.image.asset}
                      alt=""
                      sizes="56px"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : null}
                  <span className="absolute -end-0 -top-0 grid size-5 place-items-center bg-mocha font-latin-display text-xs text-white lining-nums">
                    {line.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  {product ? (
                    <>
                      <p className="label text-sand-700" lang="en" dir="ltr">
                        {product.brand}
                      </p>
                      <p className="mt-1 truncate text-mocha">{product.name}</p>
                    </>
                  ) : (
                    <div className="h-4 w-2/3 animate-pulse bg-sand-100" />
                  )}
                </div>
                <p className="font-latin-display text-lg text-mocha lining-nums">
                  {product
                    ? displayPrice(product.priceCents * line.quantity, product.currency, locale)
                    : ""}
                </p>
              </li>
            );
          })}
        </ul>

        <dl className="mt-6 flex flex-col gap-3 text-sm">
          <div className="flex items-baseline justify-between gap-6">
            <dt className="text-sand-700">{t("subtotal")}</dt>
            <dd className="font-latin-display text-lg text-mocha lining-nums">
              {loading && priced.length === 0 ? "…" : displayPrice(subtotal, currency, locale)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-6">
            <dt className="text-sand-700">{t("shipping")}</dt>
            <dd className="text-mocha">{t("shippingTbc")}</dd>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-6 border-t border-sand-200 pt-4">
            <dt className="label text-mocha">{t("total")}</dt>
            <dd className="text-mocha">{t("totalTbc")}</dd>
          </div>
        </dl>

        <p className="mt-6 flex gap-3 bg-sand-100 px-4 py-4 text-sm leading-relaxed text-mocha">
          <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0 text-sand-700">
            <circle cx="10" cy="10" r="8.4" fill="none" stroke="currentColor" strokeWidth="1.1" />
            <path
              d="M10 9v5M10 6.2v.1"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          {t("notice")}
        </p>

        <SubmitButton disabled={loading || leaving}>{t("placeOrder")}</SubmitButton>
      </aside>
    </form>
  );
}

function SubmitButton({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  const t = useTranslations("Checkout");
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-disabled={pending || disabled}
      className="mt-6 flex min-h-13 w-full items-center justify-center gap-3 rounded-full bg-mocha px-8 py-4 text-sm tracking-[0.04em] text-white transition-colors duration-500 ease-luxe hover:bg-mocha-800 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? (
        <>
          <span
            aria-hidden
            className="size-3 animate-spin rounded-full border border-white/40 border-t-white"
          />
          {t("placing")}
        </>
      ) : (
        children
      )}
    </button>
  );
}

function Section({
  index,
  title,
  optional,
  children,
}: {
  index: number;
  title: string;
  optional?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-sand-200 pt-8">
      <h2 className="flex items-baseline gap-4 text-h3 text-mocha">
        <span aria-hidden className="font-latin-display text-lg text-sand-700 lining-nums">
          {String(index).padStart(2, "0")}
        </span>
        {title}
        {optional ? <span className="text-sm text-sand-700">{optional}</span> : null}
      </h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  optional,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="flex items-baseline gap-2 text-xs tracking-[0.06em] text-sand-700"
      >
        {label}
        {optional ? <span className="text-sand-700/70">· {optional}</span> : null}
      </label>
      {children}
    </div>
  );
}
