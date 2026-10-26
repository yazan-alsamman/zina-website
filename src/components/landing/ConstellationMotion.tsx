"use client";

import { type ReactNode, useRef } from "react";
import { useLandingStore } from "@/lib/landing-store";
import { gsap, motionQueries, ScrollTrigger, useGSAP } from "@/lib/gsap";

const STILL_JOURNEY = 0.32; // reduced motion: one composed, static view of the constellation

/**
 * The houses panel stays on screen (CSS sticky, so pinning never causes layout shift) while the
 * tall track around it scrubs the camera journey through the brand constellation. With reduced
 * motion the track collapses to one screen and the scene snaps to a single calm framing.
 */
export function ConstellationMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const track = ref.current;
      if (!track) return;
      const { set } = useLandingStore.getState();
      const copy = track.querySelector("[data-houses-copy]");

      const mm = gsap.matchMedia();

      mm.add(motionQueries.motionOk, () => {
        const range = { trigger: track, start: "top top", end: "bottom bottom" };
        ScrollTrigger.create({
          ...range,
          scrub: true,
          onUpdate: (self) => set({ journey: self.progress }),
        });

        if (copy) {
          gsap
            .timeline({ scrollTrigger: { ...range, scrub: true } })
            .fromTo(
              copy,
              { autoAlpha: 0, y: 40 },
              { autoAlpha: 1, y: 0, duration: 0.12, ease: "none" },
            )
            .to(copy, { autoAlpha: 1, duration: 0.7 })
            .to(copy, { autoAlpha: 0, y: -30, duration: 0.18, ease: "none" });
        }
      });

      mm.add(motionQueries.reduceMotion, () => {
        ScrollTrigger.create({
          trigger: track,
          start: "top 60%",
          end: "bottom 40%",
          onToggle: (self) => set({ journey: self.isActive ? STILL_JOURNEY : 0 }),
        });
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    // 4.2 screens of scroll for the journey; a single screen when motion is reduced.
    <div ref={ref} className="relative h-svh motion-safe:h-[420svh]">
      <div className="sticky top-0 h-svh">{children}</div>
    </div>
  );
}
