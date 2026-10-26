"use client";

import { create } from "zustand";

export type DeviceTier = "high" | "low";

type LandingState = {
  /** 0 → 1 while the hero scrolls out of view. */
  hero: number;
  /** 0 → 1 across the pinned brand-constellation journey. */
  journey: number;
  /** Normalised scroll velocity (0 … 1), used for the fast-scroll chromatic aberration. */
  velocity: number;
  /** Pointer in normalised device coords (-1 … 1), tracked on window. */
  pointer: { x: number; y: number };
  /** True while a 3D-backed section is on screen; the render loop sleeps otherwise. */
  stageActive: boolean;
  /** 0 → 1 load progress for the preloader (3D chunk, drei useProgress, first frame). */
  loadProgress: number;
  /** The 3D scene compiled and rendered its first frame (or WebGL is unavailable). */
  sceneReady: boolean;
  /** The preloader has left the screen; hero entrance may play. */
  introDone: boolean;
  tier: DeviceTier;
};

type LandingActions = {
  set: (partial: Partial<LandingState>) => void;
};

/**
 * Bridge between DOM scroll choreography (GSAP) and the R3F scene. Per-frame values are read
 * with `useLandingStore.getState()` inside `useFrame`, so scrolling never re-renders React.
 */
export const useLandingStore = create<LandingState & LandingActions>()((set) => ({
  hero: 0,
  journey: 0,
  velocity: 0,
  pointer: { x: 0, y: 0 },
  stageActive: true,
  loadProgress: 0,
  sceneReady: false,
  introDone: false,
  tier: "high",
  set: (partial) => set(partial),
}));
