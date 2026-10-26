"use client";

import { useProgress } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useLandingStore } from "@/lib/landing-store";

// Preloader weighting: 45 % once this chunk runs, +30 % for loader assets, the rest on first frame.
const CHUNK_WEIGHT = 0.45;
const ASSET_WEIGHT = 0.3;

/** Feeds drei's loading manager progress into the preloader. */
export function ProgressBridge() {
  const { progress, total } = useProgress();

  useEffect(() => {
    const state = useLandingStore.getState();
    if (state.sceneReady) return;
    const assets = total > 0 ? progress / 100 : 1;
    const value = CHUNK_WEIGHT + ASSET_WEIGHT * assets;
    if (value > state.loadProgress) state.set({ loadProgress: value });
  }, [progress, total]);

  return null;
}

/** Rendered after everything inside Suspense resolved: marks the scene as ready after 2 frames. */
export function ReadySignal() {
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        useLandingStore.getState().set({ sceneReady: true, loadProgress: 1 });
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);

  return null;
}

/**
 * Puts the render loop to sleep while no 3D section is on screen. With reduced motion the
 * scene renders on demand only, when scroll state changes.
 */
export function FrameloopController() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);
  const still = usePrefersReducedMotion();

  useEffect(() => {
    const awake = still ? "demand" : "always";
    setFrameloop(useLandingStore.getState().stageActive ? awake : "never");

    return useLandingStore.subscribe((state, prev) => {
      if (state.stageActive !== prev.stageActive) {
        setFrameloop(state.stageActive ? awake : "never");
        if (state.stageActive) invalidate();
      }
      if (still && (state.hero !== prev.hero || state.journey !== prev.journey)) invalidate();
    });
  }, [setFrameloop, invalidate, still]);

  return null;
}
