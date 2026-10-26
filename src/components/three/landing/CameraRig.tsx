"use client";

import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useMemo } from "react";
import { Vector3 } from "three";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useLandingStore } from "@/lib/landing-store";
import { HERO_CAMERA_Z } from "./palette";

const HERO_DOLLY = 3; // camera eases forward as the hero leaves
const JOURNEY_LENGTH = 52; // world units travelled through the constellation

/** Scroll-driven camera: a slow dolly out of the hero, then a gliding flight through the houses. */
export function CameraRig() {
  const still = usePrefersReducedMotion();
  const target = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(), []);

  useFrame((state, delta) => {
    const { hero, journey, pointer } = useLandingStore.getState();
    const camera = state.camera;

    // A gentle S-curve so the flight never feels like a straight rail.
    const swayX = Math.sin(journey * Math.PI * 2) * 0.7;
    const swayY = Math.sin(journey * Math.PI) * 0.35;
    const px = still ? 0 : pointer.x * 0.28;
    const py = still ? 0 : pointer.y * 0.16;

    target.set(
      swayX + px,
      swayY + py,
      HERO_CAMERA_Z - hero * HERO_DOLLY - journey * JOURNEY_LENGTH,
    );

    if (still) camera.position.copy(target);
    else easing.damp3(camera.position, target, 0.32, delta);

    look.set(camera.position.x * 0.35, camera.position.y * 0.35, camera.position.z - 10);
    camera.lookAt(look);
  });

  return null;
}
