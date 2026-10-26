"use client";

import { lazy } from "react";
import { Scene } from "@/components/three/Scene";

// Loaded inside the canvas' Suspense boundary, so drei stays out of the page chunk.
const TestSphere = lazy(() => import("@/components/three/TestSphere"));

export function HeroSphereStage() {
  return (
    <div className="absolute inset-0">
      <Scene className="h-full w-full">
        <TestSphere />
      </Scene>
    </div>
  );
}
