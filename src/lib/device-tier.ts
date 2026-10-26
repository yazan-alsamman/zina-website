import type { DeviceTier } from "./landing-store";

/**
 * First guess at GPU headroom, refined at runtime by drei's PerformanceMonitor.
 * Narrow screens, few cores or little memory start on the low tier.
 */
export function detectDeviceTier(): DeviceTier {
  if (typeof window === "undefined") return "high";

  const narrow = window.innerWidth < 768;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;

  return narrow || (coarse && cores <= 6) || cores <= 4 || memory <= 4 ? "low" : "high";
}
