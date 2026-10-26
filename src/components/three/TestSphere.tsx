"use client";

import { Environment, Float, Lightformer } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const SAND = "#b8a48f";

/** Pipeline smoke test: a softly lit, slowly floating sand-coloured glossy sphere. */
export default function TestSphere() {
  const reducedMotion = usePrefersReducedMotion();
  // Size relative to the visible area so the sphere reads the same on phones and desktops.
  const radius = useThree((state) => Math.min(state.viewport.width, state.viewport.height) * 0.27);

  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 4, 5]} intensity={1.3} color="#fff8f0" />

      <Float
        speed={reducedMotion ? 0 : 1.1}
        rotationIntensity={reducedMotion ? 0 : 0.3}
        floatIntensity={reducedMotion ? 0 : 0.8}
        floatingRange={[-0.1, 0.1]}
      >
        <mesh scale={radius}>
          <sphereGeometry args={[1, 96, 96]} />
          <meshPhysicalMaterial
            color={SAND}
            roughness={0.32}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.22}
            sheen={0.5}
            sheenColor="#f1ede9"
          />
        </mesh>
      </Float>

      {/* Local studio environment built from soft light panels: no HDRI download needed. */}
      <Environment resolution={256} frames={1} environmentIntensity={1.4}>
        <Lightformer
          form="rect"
          intensity={1.6}
          color="#ffffff"
          position={[0, 4, 1]}
          scale={[10, 4, 1]}
          rotation-x={Math.PI / 2}
        />
        <Lightformer
          form="rect"
          intensity={0.9}
          color="#f1ede9"
          position={[-5, 1, 2]}
          scale={[4, 8, 1]}
          rotation-y={Math.PI / 2}
        />
        <Lightformer
          form="rect"
          intensity={0.6}
          color="#dcd2c7"
          position={[5, -1, 2]}
          scale={[4, 8, 1]}
          rotation-y={-Math.PI / 2}
        />
        <Lightformer
          form="circle"
          intensity={2}
          color="#ffffff"
          position={[2, 2.5, 5]}
          scale={1.4}
        />
      </Environment>
    </>
  );
}
