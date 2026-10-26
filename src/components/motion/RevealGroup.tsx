"use client";

import { type ElementType, type ReactNode, useRef } from "react";
import { gsap, motionQueries, useGSAP } from "@/lib/gsap";

/** Reveals its `[data-reveal]` descendants together, once, as the group scrolls into view. */
export function RevealGroup({
  as: Tag = "div",
  children,
  className,
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(motionQueries.motionOk, () => {
        gsap.from(el.querySelectorAll("[data-reveal]"), {
          autoAlpha: 0,
          y: 36,
          duration: 1.2,
          stagger: 0.12,
          scrollTrigger: { trigger: el, start: "top 82%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
