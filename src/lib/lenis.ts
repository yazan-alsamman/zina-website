import type Lenis from "lenis";

let instance: Lenis | null = null;

/** The root Lenis instance, or null when smooth scrolling is off (reduced motion). */
export function getLenis(): Lenis | null {
  return instance;
}

export function setLenis(lenis: Lenis | null) {
  instance = lenis;
}
