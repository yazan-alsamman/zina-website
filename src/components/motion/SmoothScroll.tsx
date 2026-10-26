"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { setLenis } from "@/lib/lenis";

/**
 * Root Lenis instance driven by GSAP's ticker so Lenis and ScrollTrigger share one RAF loop.
 * Not created at all when the visitor prefers reduced motion (native scrolling instead).
 */
export function SmoothScroll() {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const lenis = new Lenis({ autoRaf: false, lerp: 0.09, anchors: true });
    setLenis(lenis);
    const removeScrollListener = lenis.on("scroll", () => ScrollTrigger.update());

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      removeScrollListener();
      setLenis(null);
      lenis.destroy();
    };
  }, [reducedMotion]);

  return null;
}
