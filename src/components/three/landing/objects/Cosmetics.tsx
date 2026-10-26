"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { type InstancedMesh, Object3D, SphereGeometry } from "three";
import { useDisposable } from "../useDisposable";
import {
  compactShell,
  lipstickBullet,
  lipstickCap,
  lipstickCase,
  lipstickSleeve,
  perfumeBody,
  perfumeCap,
  perfumeJuice,
  perfumeNeck,
} from "./geometry";
import type { HeroMaterials } from "./materials";

type ObjectProps = { materials: HeroMaterials; segments: number };

export function Lipstick({ materials, segments }: ObjectProps) {
  const body = useDisposable(() => lipstickCase(segments), [segments]);
  const sleeve = useDisposable(() => lipstickSleeve(segments), [segments]);
  const bullet = useDisposable(() => lipstickBullet(segments), [segments]);

  return (
    // Pivot near the visual centre so floating rotation looks natural.
    <group position-y={-0.8}>
      <mesh geometry={body} material={materials.lacquer} />
      <mesh geometry={sleeve} material={materials.champagne} />
      <mesh geometry={bullet} material={materials.bullet} />
    </group>
  );
}

export function LipstickCap({ materials, segments }: ObjectProps) {
  const cap = useDisposable(() => lipstickCap(segments), [segments]);
  return <mesh geometry={cap} material={materials.lacquer} position-y={-0.42} />;
}

export function Perfume({ materials, segments }: ObjectProps) {
  const body = useDisposable(perfumeBody, []);
  const juice = useDisposable(perfumeJuice, []);
  const neck = useDisposable(() => perfumeNeck(segments / 2), [segments]);
  const cap = useDisposable(perfumeCap, []);

  return (
    <group>
      <mesh
        geometry={juice}
        material={materials.juice}
        position-y={-0.2}
        rotation-y={Math.PI / 8}
      />
      <mesh geometry={body} material={materials.glass} rotation-y={Math.PI / 8} />
      <mesh geometry={neck} material={materials.champagne} position-y={0.68} />
      <mesh
        geometry={cap}
        material={materials.champagne}
        position-y={1.0}
        rotation-y={Math.PI / 6}
      />
    </group>
  );
}

export function Compact({ materials, segments }: ObjectProps) {
  const shell = useDisposable(() => compactShell(segments), [segments]);

  return (
    <group>
      <mesh geometry={shell} material={materials.champagne} />
      {/* Pressed powder sitting in a thin metal pan on top of the base */}
      <mesh material={materials.powder} position-y={0.142} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.5, segments]} />
      </mesh>
      <mesh material={materials.champagne} position-y={0.142} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[0.51, 0.012, 8, segments]} />
      </mesh>
      {/* Lid hinged at the back edge, opened to show its mirror */}
      <group position={[0, 0.14, -0.6]} rotation-x={-1.92}>
        <group position-z={0.6}>
          <mesh geometry={shell} material={materials.champagne} />
          {/* Mirror on the lid's underside; faces the viewer once the lid is open */}
          <mesh material={materials.mirror} position-y={-0.004} rotation-x={Math.PI / 2}>
            <circleGeometry args={[0.54, segments]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export type PearlSpec = { position: [number, number, number]; radius: number; phase: number };

/** Instanced pearls: one draw call, each bobbing on its own phase. */
export function Pearls({
  materials,
  segments,
  pearls,
  still,
}: ObjectProps & { pearls: PearlSpec[]; still: boolean }) {
  const ref = useRef<InstancedMesh>(null);
  const geometry = useDisposable(() => new SphereGeometry(1, segments, segments / 2), [segments]);
  const dummy = useMemo(() => new Object3D(), []);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = still ? 0 : state.clock.elapsedTime;
    pearls.forEach((pearl, i) => {
      dummy.position.set(
        pearl.position[0],
        pearl.position[1] + Math.sin(t * 0.6 + pearl.phase) * 0.06,
        pearl.position[2],
      );
      dummy.scale.setScalar(pearl.radius);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, materials.pearl, pearls.length]}
      frustumCulled={false}
    />
  );
}

export function Droplet({ materials, segments }: ObjectProps) {
  const geometry = useDisposable(() => new SphereGeometry(1, segments, segments / 2), [segments]);
  return <mesh geometry={geometry} material={materials.droplet} scale={[0.09, 0.12, 0.09]} />;
}
