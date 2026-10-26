"use client";

import { type ReactNode, useRef } from "react";
import { cn } from "@/lib/cn";
import { gsap, useGSAP } from "@/lib/gsap";

const FINE_POINTER =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

/** Pulls its child gently toward the pointer. Inert on touch devices and with reduced motion. */
export function Magnetic({
  children,
  strength = 0.3,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const el = ref.current;
      if (!el || !contextSafe) return;

      const mm = gsap.matchMedia();
      mm.add(FINE_POINTER, () => {
        const xTo = gsap.quickTo(el, "x", { duration: 0.7, ease: "power3.out" });
        const yTo = gsap.quickTo(el, "y", { duration: 0.7, ease: "power3.out" });

        const onMove = contextSafe((event: PointerEvent) => {
          const rect = el.getBoundingClientRect();
          xTo((event.clientX - (rect.left + rect.width / 2)) * strength);
          yTo((event.clientY - (rect.top + rect.height / 2)) * strength);
        });
        const onLeave = contextSafe(() => {
          xTo(0);
          yTo(0);
        });

        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        return () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        };
      });

      return () => mm.revert();
    },
    { scope: ref, dependencies: [strength] },
  );

  return (
    <span ref={ref} className={cn("inline-block will-change-transform", className)}>
      {children}
    </span>
  );
}
