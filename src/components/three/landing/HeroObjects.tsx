"use client";

import { Float } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import { type ReactNode, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useLandingStore } from "@/lib/landing-store";
import {
  Compact,
  Droplet,
  Lipstick,
  LipstickCap,
  Pearls,
  type PearlSpec,
  Perfume,
} from "./objects/Cosmetics";
import { useHeroMaterials } from "./objects/materials";
import { HERO_VIEW_HEIGHT } from "./palette";

type Vec3 = [number, number, number];
type Placement = { position: Vec3; rotation: Vec3; scale: number; depth: number };

// Pearls as fractions of the visible frame (x, y), plus depth and radius.
const PEARLS: Array<[number, number, number, number]> = [
  [-0.44, 0.33, -1.2, 0.11],
  [-0.27, 0.41, 0.6, 0.06],
  [0.08, 0.43, -2.2, 0.08],
  [0.46, -0.34, 0.5, 0.09],
  [0.31, -0.06, 1.4, 0.05],
  [-0.14, -0.41, -0.6, 0.1],
  [-0.47, -0.02, -2.6, 0.13],
  [0.45, 0.42, -1.9, 0.1],
  [0.03, -0.46, 1.6, 0.045],
  [-0.33, -0.33, 1.9, 0.04],
];

/**
 * Three compositions:
 *  - wide LTR: centred headline, objects frame it left and right;
 *  - wide RTL: the Arabic headline is set on the right, so objects gather on the left;
 *  - narrow: a clear horizontal band for the text, objects in the top and bottom edges.
 */
function useLayout(width: number, height: number, rtl: boolean) {
  return useMemo(() => {
    const aspect = width / height;
    const H = HERO_VIEW_HEIGHT;
    const W = H * aspect;
    const wide = aspect >= 1;
    const k = wide ? Math.min(Math.max(W / 10, 0.8), 1.15) : Math.min(Math.max(W / 4.2, 0.5), 0.72);

    const place = (position: Vec3, rotation: Vec3, scale: number, depth: number): Placement => ({
      position,
      rotation,
      scale: scale * k,
      depth,
    });

    let objects;
    if (!wide) {
      // Text owns roughly y ∈ [-1.35, 1.45]; every object stays above or below that band.
      objects = {
        perfume: place([0.3 * W, 2.05, -0.6], [0.12, -0.5, 0.06], 0.95, 1.2),
        lipstick: place([-0.28 * W, -2.1, 0.3], [0.15, 0.4, -0.5], 1, 1.6),
        cap: place([-0.33 * W, 2.3, -1.4], [0.6, 0, 0.9], 0.75, 0.8),
        compact: place([0.27 * W, -2.25, 0.6], [0.6, -0.35, 0.12], 0.95, 1.9),
        droplets: [
          place([-0.4 * W, 1.75, -0.2], [0, 0, 0], 1, 1),
          place([0.42 * W, -1.6, 0.4], [0, 0, 0.3], 0.9, 1.4),
        ],
      };
    } else if (rtl) {
      objects = {
        perfume: place([-0.37 * W, 0.4, -0.6], [0.12, 0.5, -0.06], 1, 1.2),
        compact: place([-0.15 * W, -1.75, 0.9], [0.55, 0.35, -0.12], 1, 1.9),
        cap: place([-0.08 * W, 1.95, -1.6], [0.6, 0, -0.9], 0.8, 0.8),
        // Laid low in the bottom-right corner, beneath the right-aligned Arabic copy.
        lipstick: place([0.36 * W, -2.05, 0.3], [0.2, -0.4, 1.15], 0.85, 1.6),
        droplets: [
          place([-0.26 * W, 1.5, 0.4], [0, 0, 0], 1, 1.4),
          place([-0.45 * W, -1.05, 1.0], [0, 0, -0.3], 0.8, 2),
          place([0.05 * W, -2.2, -0.2], [0, 0, 0.2], 1, 1),
        ],
      };
    } else {
      objects = {
        perfume: place([0.4 * W, 0.35, -0.6], [0.12, -0.5, 0.06], 1, 1.2),
        lipstick: place([-0.37 * W, -0.25, 0.3], [0.15, 0.4, -0.32], 1, 1.6),
        cap: place([-0.22 * W, 1.6, -1.6], [0.6, 0, 0.9], 0.85, 0.8),
        compact: place([0.19 * W, -1.8, 0.9], [0.55, -0.35, 0.12], 1, 1.9),
        droplets: [
          place([0.26 * W, 1.45, 0.4], [0, 0, 0], 1, 1.4),
          place([0.44 * W, -1.0, 1.0], [0, 0, 0.3], 0.8, 2),
          place([-0.43 * W, 1.15, -0.2], [0, 0, -0.2], 1.1, 1),
        ],
      };
    }

    // Keep pearls out of the text zone for each composition.
    const inTextZone = ([fx, fy]: [number, number, number, number]) =>
      !wide ? Math.abs(fy) < 0.3 : rtl ? fx > -0.02 && Math.abs(fy) < 0.4 : false;
    const pearls: PearlSpec[] = PEARLS.map(
      ([fx, fy, z, r]) => [rtl && wide ? -fx : fx, fy, z, r] as [number, number, number, number],
    )
      .filter((p) => !inTextZone(p))
      .map(([fx, fy, z, r], i) => ({
        position: [fx * W, fy * H, z],
        radius: r * (wide ? 1 : 0.8),
        phase: i * 1.7,
      }));

    return { objects, pearls };
  }, [width, height, rtl]);
}

/** Wraps one object: drei Float for idle motion, damped pointer parallax, spread on scroll. */
function Item({
  placement,
  children,
  still,
}: {
  placement: Placement;
  children: ReactNode;
  still: boolean;
}) {
  const ref = useRef<Group>(null);
  const { position, rotation, scale, depth } = placement;

  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    const { pointer, hero } = useLandingStore.getState();
    const px = still ? 0 : pointer.x;
    const py = still ? 0 : pointer.y;

    const target: Vec3 = [
      position[0] * (1 + hero * 0.6) + px * depth * 0.22,
      position[1] * (1 + hero * 0.35) + py * depth * 0.14,
      position[2] + hero * depth * 0.8,
    ];
    const turn: Vec3 = [
      rotation[0] - py * 0.12 * depth,
      rotation[1] + px * 0.22 * depth,
      rotation[2],
    ];

    if (still) {
      group.position.set(...target);
      group.rotation.set(...turn);
    } else {
      easing.damp3(group.position, target, 0.45, delta);
      easing.dampE(group.rotation, turn, 0.6, delta);
    }
  });

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <Float
        speed={still ? 0 : 0.9 + depth * 0.15}
        rotationIntensity={still ? 0 : 0.35}
        floatIntensity={still ? 0 : 0.6}
        floatingRange={[-0.08, 0.08]}
      >
        {children}
      </Float>
    </group>
  );
}

export function HeroObjects() {
  const tier = useLandingStore((s) => s.tier);
  const still = usePrefersReducedMotion();
  const size = useThree((s) => s.size);
  // The canvas is client-only, so the document direction is known at mount.
  const [rtl] = useState(() => document.documentElement.dir === "rtl");
  const { objects, pearls } = useLayout(size.width, size.height, rtl);
  const materials = useHeroMaterials(tier);
  const segments = tier === "high" ? 96 : 40;

  const rootRef = useRef<Group>(null);
  const intro = useRef({ value: still ? 1 : 0 });

  useFrame((_, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const { introDone } = useLandingStore.getState();
    if (still) intro.current.value = 1;
    else easing.damp(intro.current, "value", introDone ? 1 : 0, 0.9, delta);
    const v = intro.current.value;
    root.position.y = -1.4 * (1 - v);
    root.scale.setScalar(0.9 + 0.1 * v);
  });

  const shared = { materials, segments };

  return (
    <group ref={rootRef}>
      <Item placement={objects.perfume} still={still}>
        <Perfume {...shared} />
      </Item>
      <Item placement={objects.lipstick} still={still}>
        <Lipstick {...shared} />
      </Item>
      <Item placement={objects.cap} still={still}>
        <LipstickCap {...shared} />
      </Item>
      <Item placement={objects.compact} still={still}>
        <Compact {...shared} />
      </Item>
      {objects.droplets.map((placement, i) => (
        <Item key={i} placement={placement} still={still}>
          <Droplet {...shared} segments={tier === "high" ? 32 : 16} />
        </Item>
      ))}
      <Pearls {...shared} segments={tier === "high" ? 48 : 20} pearls={pearls} still={still} />
    </group>
  );
}
