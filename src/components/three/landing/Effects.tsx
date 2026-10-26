"use client";

import { useFrame } from "@react-three/fiber";
import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  Noise,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { easing } from "maath";
import {
  BlendFunction,
  type ChromaticAberrationEffect,
  type DepthOfFieldEffect,
  ToneMappingMode,
} from "postprocessing";
import { useMemo, useRef } from "react";
import { Vector2 } from "three";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useLandingStore } from "@/lib/landing-store";
import { HERO_CAMERA_Z } from "./palette";

/**
 * Subtle film finish. Every tier gets bloom, vignette and grain; capable desktops also get
 * depth of field that follows the story and chromatic aberration only while scrolling fast.
 */
export function Effects() {
  const tier = useLandingStore((s) => s.tier);
  const still = usePrefersReducedMotion();
  const cinematic = tier === "high" && !still;

  const dof = useRef<DepthOfFieldEffect>(null);
  const aberration = useRef<ChromaticAberrationEffect>(null);
  const offset = useMemo(() => new Vector2(0, 0), []);
  const focus = useRef({ distance: HERO_CAMERA_Z, amount: 0 });

  useFrame((_, delta) => {
    const store = useLandingStore.getState();
    // Velocity decays between scroll events so the effect settles when scrolling stops.
    if (store.velocity > 0.001) store.set({ velocity: store.velocity * 0.9 });

    if (dof.current) {
      // Hero: objects sharp at z = 0. Journey: focus a few metres ahead, far names melt away.
      const inJourney = store.journey > 0.01;
      easing.damp(
        focus.current,
        "distance",
        inJourney ? 5.5 : HERO_CAMERA_Z - store.hero * 3,
        0.4,
        delta,
      );
      dof.current.cocMaterial.focusDistance = focus.current.distance;
      dof.current.cocMaterial.focusRange = inJourney ? 3.5 : 5;
    }

    if (aberration.current) {
      easing.damp(focus.current, "amount", store.velocity, 0.2, delta);
      const a = focus.current.amount * 0.0028;
      aberration.current.offset.set(a, a * 0.6);
    }
  });

  return (
    <EffectComposer multisampling={cinematic ? 4 : 0} enableNormalPass={false}>
      {cinematic ? (
        <DepthOfField ref={dof} focusDistance={HERO_CAMERA_Z} focusRange={5} bokehScale={2.6} />
      ) : null}
      <Bloom
        mipmapBlur
        intensity={0.55}
        luminanceThreshold={0.78}
        luminanceSmoothing={0.25}
        radius={0.7}
      />
      {cinematic ? (
        <ChromaticAberration
          ref={aberration}
          offset={offset}
          radialModulation
          modulationOffset={0.35}
        />
      ) : null}
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <Vignette offset={0.26} darkness={0.58} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.42} />
    </EffectComposer>
  );
}
