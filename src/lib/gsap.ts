"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

let registered = false;

function registerGsap() {
  if (registered || typeof window === "undefined") return;
  registered = true;

  gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase, SplitText);

  // Mirror the CSS easing tokens (globals.css) so CSS and GSAP motion feel identical.
  CustomEase.create("luxe", "M0,0 C0.22,1 0.36,1 1,1");
  CustomEase.create("silk", "M0,0 C0.65,0 0.35,1 1,1");
  CustomEase.create("settle", "M0,0 C0.16,1 0.3,1 1,1");

  gsap.defaults({ ease: "luxe", duration: 0.9 });
}

registerGsap();

/** Media queries for `gsap.matchMedia()` so every timeline can branch on reduced motion. */
export const motionQueries = {
  motionOk: "(prefers-reduced-motion: no-preference)",
  reduceMotion: "(prefers-reduced-motion: reduce)",
} as const;

export { CustomEase, gsap, ScrollTrigger, SplitText, useGSAP };
