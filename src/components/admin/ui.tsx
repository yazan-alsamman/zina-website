import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { type OrderStatus, STATUS_LABELS } from "@/lib/orders/workflow";

export const inputClass =
  "w-full border border-sand-200 bg-white px-3.5 py-2.5 text-[0.95rem] text-mocha placeholder:text-mocha-300 transition-colors duration-300 hover:border-sand focus:border-mocha focus:outline-none aria-[invalid=true]:border-sand-700";

export const buttonClass = {
  primary:
    "inline-flex items-center justify-center gap-2 bg-mocha px-5 py-2.5 text-sm tracking-wide text-white transition-colors duration-300 hover:bg-mocha-800 disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-2 border border-mocha/25 bg-white px-5 py-2.5 text-sm tracking-wide text-mocha transition-colors duration-300 hover:border-mocha disabled:cursor-not-allowed disabled:opacity-50",
  quiet:
    "inline-flex items-center gap-2 text-sm text-sand-700 underline decoration-sand-200 underline-offset-4 transition-colors hover:text-mocha hover:decoration-mocha",
} as const;

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-6 border-b border-sand-200 pb-8 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="label text-sand-700">{eyebrow}</p> : null}
        <h1 className="mt-3 font-latin-display text-h2 font-light text-mocha">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-[60ch] text-sm text-sand-700">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  aside,
  children,
  className,
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border border-sand-200 bg-white", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-4 border-b border-sand-200 px-6 py-4">
          <h2 className="label text-mocha">{title}</h2>
          {aside}
        </div>
      ) : null}
      <div className="p-6">{children}</div>
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  errors,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  errors?: string[];
  children: ReactNode;
  className?: string;
}) {
  const errorId = `${htmlFor}-error`;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="text-xs font-medium tracking-wide text-mocha">
        {label}
      </label>
      {children}
      {hint && !errors?.length ? <p className="text-xs text-sand-700">{hint}</p> : null}
      {errors?.length ? (
        <p id={errorId} role="alert" className="text-xs text-mocha">
          <span
            aria-hidden
            className="me-1.5 inline-block size-1.5 translate-y-[-1px] rounded-full bg-sand-700"
          />
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

/** Props that wire an input to its Field's error message. */
export function errorProps(id: string, errors?: string[]) {
  return errors?.length ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {};
}

export function FormMessage({ state }: { state: { ok?: boolean; message?: string } }) {
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cn(
        "border px-4 py-3 text-sm",
        state.ok
          ? "border-sand-200 bg-sand-100 text-mocha"
          : "border-sand-700/40 bg-white text-mocha",
      )}
    >
      {state.message}
    </p>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING_REVIEW: "bg-sand-100 text-mocha",
  AWAITING_PAYMENT: "border border-sand bg-white text-sand-700",
  APPROVED: "bg-mocha text-white",
  SHIPPED: "bg-mocha-800 text-sand-100",
  DELIVERED: "bg-mist text-mocha",
  CANCELLED: "border border-sand-200 bg-white text-sand-700 line-through decoration-sand",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-xs whitespace-nowrap",
        STATUS_STYLE[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PublishedBadge({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs",
        published ? "text-mocha" : "text-sand-700",
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", published ? "bg-mocha" : "border border-sand-700")}
      />
      {published ? "Published" : "Draft"}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 border border-dashed border-sand-200 bg-white px-8 py-12">
      <p className="font-latin-display text-h3 font-light text-mocha">{title}</p>
      {body ? <p className="max-w-[52ch] text-sm text-sand-700">{body}</p> : null}
      {action}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof buttonClass;
}) {
  return (
    <Link href={href} className={buttonClass[variant]}>
      {children}
    </Link>
  );
}

export const tableClass = {
  table: "w-full border-collapse text-left text-sm",
  head: "border-b border-sand-200 text-xs tracking-wide text-sand-700 [&_th]:px-4 [&_th]:py-3 [&_th]:font-normal",
  row: "border-b border-sand-200/70 transition-colors last:border-0 hover:bg-sand-100/40 [&_td]:px-4 [&_td]:py-3.5 [&_td]:align-middle",
};
