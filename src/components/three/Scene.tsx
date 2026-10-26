"use client";

import dynamic from "next/dynamic";
import { SceneFallback } from "./SceneFallback";
import type { SceneCanvasProps } from "./SceneCanvas";

/**
 * Client-only R3F canvas. three/fiber/drei are split into their own chunk and never
 * rendered on the server; a static fallback holds the space until the canvas is ready.
 */
const SceneCanvas = dynamic(() => import("./SceneCanvas"), {
  ssr: false,
  loading: () => <SceneFallback className="absolute inset-0" />,
});

export function Scene(props: SceneCanvasProps) {
  return <SceneCanvas {...props} />;
}
