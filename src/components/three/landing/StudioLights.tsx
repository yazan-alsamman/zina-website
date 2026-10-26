"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { palette } from "./palette";

/** Soft studio light built from local light panels (no HDRI download). */
export function StudioLights() {
  return (
    <>
      <ambientLight intensity={0.35} color={palette.sand200} />
      <directionalLight position={[4, 6, 6]} intensity={1.8} color="#fff6ec" />
      <directionalLight position={[-6, -2, 3]} intensity={0.45} color={palette.sand} />
      {/* Warm rim lights from behind: the edge glow of packaging photography */}
      <directionalLight position={[-4, 3, -6]} intensity={2.4} color="#f3e2cc" />
      <directionalLight position={[5, -1, -5]} intensity={1.2} color={palette.sand} />

      <Environment resolution={256} frames={1} environmentIntensity={1}>
        {/* Warm room tone: metals and glass reflect mocha instead of a black void */}
        <color attach="background" args={[palette.mocha]} />
        {/* Broad softbox behind the camera: gives champagne metal and the mirror their glow */}
        <Lightformer
          form="rect"
          intensity={1.4}
          color={palette.sand100}
          position={[0, 0.5, 9]}
          scale={[14, 5, 1]}
          rotation-y={Math.PI}
        />
        {/* Overhead softbox */}
        <Lightformer
          form="rect"
          intensity={2.6}
          color={palette.sand100}
          position={[0, 5, -1]}
          scale={[12, 3, 1]}
          rotation-x={Math.PI / 2}
        />
        {/* Side strips draw long, elegant highlights on glass and metal */}
        <Lightformer
          form="rect"
          intensity={2}
          color={palette.white}
          position={[-5, 1, 2]}
          scale={[1.2, 9, 1]}
          rotation-y={Math.PI / 2}
        />
        <Lightformer
          form="rect"
          intensity={1.1}
          color={palette.sand}
          position={[5, 0, 1]}
          scale={[1.2, 9, 1]}
          rotation-y={-Math.PI / 2}
        />
        {/* Back strip: rim reflections along lacquer and metal edges */}
        <Lightformer
          form="rect"
          intensity={2.2}
          color={palette.sand}
          position={[0, 1, -8]}
          scale={[16, 1.4, 1]}
        />
        {/* Front catchlight */}
        <Lightformer
          form="ring"
          intensity={1.6}
          color={palette.white}
          position={[1, 2, 8]}
          scale={1.6}
        />
      </Environment>
    </>
  );
}
