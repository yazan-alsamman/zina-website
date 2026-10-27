import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

/** Quantity stepper used on the product page, in the bag drawer and on the bag page. */
export function QuantityStepper({
  value,
  max,
  onChange,
  label,
  size = "md",
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const t = useTranslations("Shop");
  const button = cn(
    "grid place-items-center text-mocha transition-colors hover:bg-sand-100 disabled:cursor-not-allowed disabled:text-sand-200 disabled:hover:bg-transparent",
    size === "sm" ? "size-8" : "size-11",
  );

  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center rounded-full border border-sand-200"
    >
      <button
        type="button"
        className={cn(button, "rounded-s-full")}
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label={t("decrease")}
      >
        <svg aria-hidden viewBox="0 0 12 12" className="size-3">
          <path d="M2 6h8" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>
      <output
        aria-live="polite"
        className={cn(
          "text-center font-latin-display leading-none text-mocha lining-nums",
          size === "sm" ? "w-6 text-base" : "w-9 text-lg",
        )}
      >
        {value}
      </output>
      <button
        type="button"
        className={cn(button, "rounded-e-full")}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={t("increase")}
      >
        <svg aria-hidden viewBox="0 0 12 12" className="size-3">
          <path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>
    </div>
  );
}
