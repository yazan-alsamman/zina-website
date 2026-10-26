"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { detectDeviceTier } from "@/lib/device-tier";
import { useLandingStore } from "@/lib/landing-store";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

// three / fiber / drei / postprocessing live in this chunk only.
const LandingCanvas = dynamic(() => import("@/components/three/landing/LandingCanvas"), {
  ssr: false,
});

/**
 * One fixed stage behind the whole page. A CSS backdrop with the same atmosphere paints first;
 * the WebGL scene mounts after first paint, so hero text never waits for 3D.
 */
export function LandingStage() {
  const [mountCanvas, setMountCanvas] = useState(false);
  const stageActive = useLandingStore((s) => s.stageActive);

  useEffect(() => {
    const { set } = useLandingStore.getState();
    set({ tier: detectDeviceTier() });

    const onPointer = (event: PointerEvent) => {
      set({
        pointer: {
          x: (event.clientX / window.innerWidth) * 2 - 1,
          y: -((event.clientY / window.innerHeight) * 2 - 1),
        },
      });
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    // Wait for the first paint (and an idle moment) before pulling in the 3D bundle.
    let cancelIdle = () => {};
    const raf = requestAnimationFrame(() => {
      const mount = () => setMountCanvas(true);
      if (typeof window.requestIdleCallback === "function") {
        const id = window.requestIdleCallback(mount, { timeout: 900 });
        cancelIdle = () => window.cancelIdleCallback(id);
      } else {
        const id = setTimeout(mount, 120);
        cancelIdle = () => clearTimeout(id);
      }
    });

    return () => {
      window.removeEventListener("pointermove", onPointer);
      cancelAnimationFrame(raf);
      cancelIdle();
    };
  }, []);

  useGSAP(() => {
    const { set } = useLandingStore.getState();
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        set({ velocity: gsap.utils.clamp(0, 1, Math.abs(self.getVelocity()) / 4000) });
      },
    });
  });

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0"
      style={{ visibility: stageActive ? "visible" : "hidden" }}
    >
      <div className="stage-backdrop absolute inset-0" />
      {mountCanvas ? <LandingCanvas /> : null}
    </div>
  );
}
