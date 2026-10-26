"use client";

import { type ReactNode, useRef } from "react";
import { useLandingStore } from "@/lib/landing-store";
import { gsap, motionQueries, ScrollTrigger, useGSAP } from "@/lib/gsap";

/**
 * Hero scroll behaviour: reports hero progress to the 3D scene and lets the headline drift up
 * and dissolve as the camera dollies forward. Fades in the secondary hero details after the intro.
 */
export function HeroMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const introDone = useLandingStore((s) => s.introDone);

  useGSAP(
    () => {
      const el = ref.current;
      const section = el?.closest("section");
      if (!el || !section) return;
      const { set } = useLandingStore.getState();

      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom top",
        onUpdate: (self) => set({ hero: self.progress }),
      });

      const mm = gsap.matchMedia();
      mm.add(motionQueries.motionOk, () => {
        const late = section.querySelectorAll("[data-hero-late]");
        if (!introDone) {
          gsap.set(late, { autoAlpha: 0 });
          return;
        }
        gsap.fromTo(
          late,
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.12, delay: 0.75 },
        );
        gsap.to(el, {
          yPercent: -18,
          autoAlpha: 0,
          ease: "none",
          scrollTrigger: { trigger: section, start: "top top", end: "bottom 30%", scrub: true },
        });
      });
      return () => mm.revert();
    },
    { dependencies: [introDone], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className="relative flex flex-col items-center rtl:items-start">
      {children}
    </div>
  );
}
