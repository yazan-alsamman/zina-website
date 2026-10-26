"use client";

import { type ElementType, type ReactNode, useRef } from "react";
import { useLandingStore } from "@/lib/landing-store";
import { gsap, motionQueries, SplitText, useGSAP } from "@/lib/gsap";

type SplitRevealProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  id?: string;
  /** "scroll" reveals when scrolled into view; "intro" waits for the preloader to finish. */
  mode?: "scroll" | "intro";
  delay?: number;
  stagger?: number;
};

/**
 * Masked line-by-line reveal. Splits by lines only (never chars) so Arabic letter joining is
 * preserved. The text is plain HTML before hydration and with reduced motion.
 */
export function SplitReveal({
  as: Tag = "h2",
  children,
  className,
  id,
  mode = "scroll",
  delay = 0,
  stagger = 0.09,
}: SplitRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const introDone = useLandingStore((s) => s.introDone);
  const waiting = mode === "intro" && !introDone;

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add(motionQueries.motionOk, () => {
        if (waiting) {
          gsap.set(el, { autoAlpha: 0 });
          return;
        }

        const split = SplitText.create(el, {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 115,
              duration: 1.25,
              stagger,
              delay,
              ease: "luxe",
              scrollTrigger:
                mode === "scroll" ? { trigger: el, start: "top 88%", once: true } : undefined,
            }),
        });

        return () => split.revert();
      });

      return () => mm.revert();
    },
    { dependencies: [waiting, mode, delay, stagger], revertOnUpdate: true },
  );

  return (
    <Tag ref={ref} id={id} className={className}>
      {children}
    </Tag>
  );
}
