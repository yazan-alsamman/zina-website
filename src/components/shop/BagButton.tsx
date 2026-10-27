"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";
import { gsap, motionQueries, useGSAP } from "@/lib/gsap";
import { bagCount, useBagStore } from "@/lib/shop/bag-store";

/**
 * Header bag: a fine outline bag with the item count. The count rises into place whenever
 * something is added. Colours follow the header tone (currentColor).
 */
export function BagButton() {
  const t = useTranslations("Bag");
  const count = useBagStore((s) => (s.hydrated ? bagCount(s.lines) : 0));
  const addedAt = useBagStore((s) => s.addedAt);
  const openDrawer = useBagStore((s) => s.openDrawer);
  const countRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!addedAt || !countRef.current) return;
      const mm = gsap.matchMedia();
      mm.add(motionQueries.motionOk, () => {
        gsap.fromTo(
          countRef.current,
          { yPercent: 70, autoAlpha: 0, scale: 0.6 },
          { yPercent: 0, autoAlpha: 1, scale: 1, duration: 0.7, ease: "back.out(2.2)" },
        );
      });
      return () => mm.revert();
    },
    { dependencies: [addedAt] },
  );

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={t("open", { count })}
      aria-haspopup="dialog"
      className="relative -m-2 flex items-center gap-2 p-2 text-(--header-fg) transition-opacity hover:opacity-75"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-[1.35rem]" fill="none">
        <path
          d="M5.5 8.5h13l-1 11.5h-11z"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path d="M9 10V7a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.1" />
      </svg>
      <span
        ref={countRef}
        aria-hidden
        className="min-w-[1ch] font-latin-display text-[1.05rem] leading-none lining-nums"
      >
        {count > 0 ? count : ""}
      </span>
    </button>
  );
}
