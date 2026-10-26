"use client";

import { type ReactNode, useRef } from "react";
import { gsap, motionQueries, ScrollTrigger, useGSAP } from "@/lib/gsap";

/**
 * Horizontal gallery driven by vertical scroll. The panel is CSS-sticky inside a track whose
 * height equals the horizontal travel, so there is no pin and no layout shift. In RTL the track
 * runs the other way. Without motion (or without JS) it is a native, snap-scrolling row.
 */
export function EditMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const outer = ref.current;
      const viewport = outer?.querySelector<HTMLElement>("[data-edit-viewport]");
      const track = outer?.querySelector<HTMLElement>("[data-edit-track]");
      if (!outer || !viewport || !track) return;

      const mm = gsap.matchMedia();
      mm.add(motionQueries.motionOk, () => {
        const rtl = getComputedStyle(outer).direction === "rtl";
        const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
        // Scroll length = horizontal travel; recomputed before every ScrollTrigger refresh.
        const sizeTrack = () => gsap.set(outer, { height: window.innerHeight + distance() });

        gsap.set(viewport, { overflow: "visible", scrollSnapType: "none" });
        sizeTrack();
        ScrollTrigger.addEventListener("refreshInit", sizeTrack);

        gsap.to(track, {
          x: () => (rtl ? distance() : -distance()),
          ease: "none",
          scrollTrigger: {
            trigger: outer,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });

        return () => ScrollTrigger.removeEventListener("refreshInit", sizeTrack);
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className="relative overflow-x-clip">
      <div className="sticky top-0 flex min-h-svh flex-col justify-center py-16">{children}</div>
    </div>
  );
}
