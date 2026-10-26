"use client";

import { AdaptiveDpr, Preload } from "@react-three/drei";
import { Canvas, type CanvasProps } from "@react-three/fiber";
import { Suspense } from "react";
import { NeutralToneMapping } from "three";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { SceneFallback } from "./SceneFallback";
import { isWebGLAvailable } from "./webgl";

export type SceneCanvasProps = Omit<CanvasProps, "fallback" | "dpr"> & {
  /** Upper bound for the device pixel ratio; keeps fill-rate sane on 3x phones. */
  maxDpr?: number;
};

export default function SceneCanvas({
  children,
  className,
  maxDpr = 1.75,
  camera = { position: [0, 0, 5], fov: 35 },
  ...props
}: SceneCanvasProps) {
  const reducedMotion = usePrefersReducedMotion();

  if (!isWebGLAvailable()) return <SceneFallback className={className} />;

  return (
    <Canvas
      className={className}
      dpr={[1, maxDpr]}
      camera={camera}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      // Neutral tone mapping keeps brand colours closer to their hex values than ACES.
      onCreated={({ gl }) => {
        gl.toneMapping = NeutralToneMapping;
      }}
      // Static frames are enough when motion is reduced; render only on change.
      frameloop={reducedMotion ? "demand" : "always"}
      fallback={<SceneFallback className={className} />}
      aria-hidden
      {...props}
    >
      <Suspense fallback={null}>
        {children}
        <Preload all />
      </Suspense>
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
