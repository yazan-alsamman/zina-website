"use client";

import { AdaptiveDpr, PerformanceMonitor, Preload } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useLandingStore } from "@/lib/landing-store";
import { isWebGLAvailable } from "../webgl";
import { Backdrop } from "./Backdrop";
import { BrandConstellation } from "./BrandConstellation";
import { CameraRig } from "./CameraRig";
import { Effects } from "./Effects";
import { HeroObjects } from "./HeroObjects";
import { HERO_CAMERA_Z, HERO_FOV, palette } from "./palette";
import { FrameloopController, ProgressBridge, ReadySignal } from "./SceneSignals";
import { StudioLights } from "./StudioLights";

/** The single persistent WebGL canvas behind the landing page. Loaded lazily after first paint. */
export default function LandingCanvas({ houseNames }: { houseNames: readonly string[] }) {
  const tier = useLandingStore((s) => s.tier);
  const still = usePrefersReducedMotion();
  const [webgl] = useState(isWebGLAvailable);
  const maxDpr = tier === "high" ? 2 : 1.5;

  // This component's effects run on the page's own React root, so they see Next.js hiding the
  // route (Activity) when the visitor navigates away; the R3F root inside the canvas does not.
  useEffect(() => {
    useLandingStore.getState().set({ pageVisible: true });
    return () => useLandingStore.getState().set({ pageVisible: false });
  }, []);

  useEffect(() => {
    const state = useLandingStore.getState();
    // Without WebGL the CSS backdrop stays; let the preloader finish immediately.
    if (!webgl) state.set({ sceneReady: true, loadProgress: 1 });
    else if (state.loadProgress < 0.45) state.set({ loadProgress: 0.45 });
  }, [webgl]);

  if (!webgl) return null;

  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, maxDpr]}
      camera={{ position: [0, 0, HERO_CAMERA_Z], fov: HERO_FOV, near: 0.1, far: 120 }}
      gl={{ antialias: false, alpha: false, stencil: false, powerPreference: "high-performance" }}
      frameloop={still ? "demand" : "always"}
    >
      <color attach="background" args={[palette.mocha900]} />
      <fog attach="fog" args={[palette.mocha900, 9, 30]} />

      <PerformanceMonitor
        flipflops={3}
        onDecline={() => useLandingStore.getState().set({ tier: "low" })}
        onFallback={() => useLandingStore.getState().set({ tier: "low" })}
      />
      <AdaptiveDpr />

      <Suspense fallback={null}>
        <Backdrop />
        <StudioLights />
        <HeroObjects />
        <BrandConstellation names={houseNames} />
        <Preload all />
        <ReadySignal />
      </Suspense>

      <CameraRig />
      <Effects />
      <ProgressBridge />
      <FrameloopController />
    </Canvas>
  );
}
