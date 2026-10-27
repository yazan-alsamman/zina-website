import { useId } from "react";
import { cn } from "@/lib/cn";

const STAR =
  "M10 1.6l2.47 5.3 5.8.68-4.29 3.96 1.15 5.73L10 14.4l-5.13 2.87 1.15-5.73L1.73 7.58l5.8-.68z";

/**
 * Zina's rating as five fine sand stars, filled to the value (half steps). Decorative SVGs; the
 * accessible name is the `label` sentence.
 */
export function RatingStars({
  value,
  label,
  className,
  tone = "day",
  showValue = false,
  valueText,
}: {
  value: number;
  label: string;
  className?: string;
  /** "day" on white surfaces, "night" on mocha */
  tone?: "day" | "night";
  showValue?: boolean;
  valueText?: string;
}) {
  const id = useId();

  return (
    <p role="img" aria-label={label} className={cn("flex items-center gap-[0.18em]", className)}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.min(Math.max(value - i, 0), 1);
        const clipId = `${id}-${i}`;
        return (
          // Stars fill from the inline start, so they mirror in RTL.
          <svg
            key={i}
            aria-hidden
            viewBox="0 0 20 19"
            className="size-[0.95em] shrink-0 rtl:-scale-x-100"
          >
            <defs>
              <clipPath id={clipId}>
                <rect x="0" y="0" width={20 * fill} height="19" />
              </clipPath>
            </defs>
            <path
              d={STAR}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.9"
              className={tone === "night" ? "text-sand-200/60" : "text-sand"}
            />
            <path
              d={STAR}
              clipPath={`url(#${clipId})`}
              className={tone === "night" ? "fill-sand-200" : "fill-sand"}
            />
          </svg>
        );
      })}
      {showValue ? (
        <span
          aria-hidden
          className={cn(
            "ms-[0.5em] font-latin-display leading-none",
            tone === "night" ? "text-sand-100" : "text-sand-700",
          )}
        >
          {valueText}
        </span>
      ) : null}
    </p>
  );
}
