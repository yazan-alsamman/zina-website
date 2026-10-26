"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { gsap, useGSAP } from "@/lib/gsap";

const FINE_POINTER =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const INTERACTIVE = "a, button, [role='button'], [data-cursor-label], label, summary";

/**
 * A small ring that trails the pointer, grows over interactive elements and shows a contextual
 * label ("View", "Order") from `data-cursor-label`. Only on fine pointers without reduced motion.
 */
export function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);

  useGSAP((_, contextSafe) => {
    const ring = ringRef.current;
    if (!ring || !contextSafe) return;

    const mm = gsap.matchMedia();
    mm.add(FINE_POINTER, () => {
      document.documentElement.classList.add("has-custom-cursor");
      gsap.set(ring, { xPercent: -50, yPercent: -50, autoAlpha: 0 });

      const xTo = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" });
      const yTo = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" });
      let current: Element | null = null;

      const onMove = contextSafe((event: PointerEvent) => {
        xTo(event.clientX);
        yTo(event.clientY);
        gsap.to(ring, { autoAlpha: 1, duration: 0.3, overwrite: "auto" });

        const target = (event.target as Element | null)?.closest(INTERACTIVE) ?? null;
        if (target === current) return;
        current = target;

        const text = target?.getAttribute("data-cursor-label") ?? null;
        setLabel(text);
        gsap.to(ring, {
          scale: text ? 2.6 : target ? 1.7 : 1,
          duration: 0.5,
          ease: "luxe",
          overwrite: "auto",
        });
      });

      const onLeaveWindow = contextSafe(() => {
        gsap.to(ring, { autoAlpha: 0, duration: 0.3 });
      });

      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeaveWindow);

      return () => {
        document.documentElement.classList.remove("has-custom-cursor");
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
      };
    });

    return () => mm.revert();
  });

  return (
    <div
      ref={ringRef}
      aria-hidden
      className={cn(
        "pointer-events-none invisible fixed top-0 left-0 z-[60] grid size-9 place-items-center rounded-full border",
        label
          ? "border-sand bg-mocha text-white"
          : "border-white bg-transparent mix-blend-difference",
      )}
    >
      {label ? (
        // Counter-scaled so the label stays crisp while the ring is scaled up.
        <span className="scale-[0.3846] font-sans text-[0.8rem] leading-none whitespace-nowrap">
          {label}
        </span>
      ) : null}
    </div>
  );
}
