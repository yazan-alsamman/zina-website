"use client";

import { useEffect } from "react";
import { ScrollTrigger } from "@/lib/gsap";

/** Recalculates every ScrollTrigger once web fonts settle (line wraps change section heights). */
export function ScrollRefresh() {
  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
