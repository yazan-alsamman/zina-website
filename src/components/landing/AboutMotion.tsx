"use client";

import { type ReactNode, useRef } from "react";
import { useLandingStore } from "@/lib/landing-store";
import { gsap, motionQueries, ScrollTrigger, useGSAP } from "@/lib/gsap";

/**
 * Day arrives: the white About panel opens like a frame over the night stage, the portrait is
 * unveiled with a clip-path mask. Once the panel covers the screen the WebGL loop goes to sleep.
 */
export function AboutMotion({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const panel = ref.current;
      if (!panel) return;
      const { set } = useLandingStore.getState();

      ScrollTrigger.create({
        trigger: panel,
        start: "top top",
        onEnter: () => set({ stageActive: false }),
        onLeaveBack: () => set({ stageActive: true }),
      });

      const mm = gsap.matchMedia();
      mm.add(motionQueries.motionOk, () => {
        gsap.fromTo(
          panel,
          { clipPath: "inset(10% 7% 0% 7%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            ease: "none",
            scrollTrigger: { trigger: panel, start: "top bottom", end: "top 15%", scrub: true },
          },
        );

        const frame = panel.querySelector("[data-portrait]");
        const inner = panel.querySelector("[data-portrait-inner]");
        if (frame && inner) {
          gsap
            .timeline({
              scrollTrigger: { trigger: frame, start: "top 85%", end: "top 25%", scrub: true },
            })
            .fromTo(
              frame,
              { clipPath: "inset(100% 0% 0% 0%)" },
              { clipPath: "inset(0% 0% 0% 0%)", ease: "none" },
            )
            .fromTo(inner, { scale: 1.25 }, { scale: 1, ease: "none" }, 0);
        }

        gsap.from(panel.querySelectorAll("[data-stat]"), {
          autoAlpha: 0,
          y: 24,
          stagger: 0.12,
          duration: 1.1,
          scrollTrigger: {
            trigger: panel.querySelector("[data-stats]"),
            start: "top 90%",
            once: true,
          },
        });
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
