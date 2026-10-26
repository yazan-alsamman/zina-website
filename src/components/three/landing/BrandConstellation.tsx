"use client";

import { Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { MathUtils, type Mesh } from "three";
import { brands } from "@/config/brands";
import { useLandingStore } from "@/lib/landing-store";
import { palette } from "./palette";

export const FONT_URL = "/fonts/cormorant-garamond-400.woff";
export const JOURNEY_START_Z = -3;
export const JOURNEY_SPACING = 2.75;

const COLORS = [palette.white, palette.sand200, palette.sand, palette.sand100];

// Deterministic pseudo-random so the constellation is identical on every visit.
const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

type TroikaText = Mesh & { fillOpacity: number };

export function BrandConstellation() {
  const tier = useLandingStore((s) => s.tier);
  const aspect = useThree((s) => s.size.width / s.size.height);
  const refs = useRef<Array<TroikaText | null>>([]);

  const items = useMemo(() => {
    const list = tier === "high" ? brands : brands.filter((b) => b.priority === 1);
    const wide = aspect >= 1;
    const spreadX = wide ? 1 : 0.42;
    // Portrait screens put the copy higher (lower ~45 %), so both lanes sit higher there.
    const lanes = wide ? [1.25, 0.25] : [1.6, 0.8];
    return list.map((brand, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      // Names on the same side alternate between a high and a low lane so consecutive names never
      // stack on screen, and both lanes stay above the copy block in the lower third.
      const lane = lanes[Math.floor(i / 2) % 2];
      return {
        brand,
        position: [
          side * (1.3 + rand(i) * 1.6) * spreadX,
          lane + (rand(i + 11) - 0.5) * 0.45,
          JOURNEY_START_Z - i * JOURNEY_SPACING * (brands.length / list.length),
        ] as [number, number, number],
        size: (0.36 + rand(i + 23) * 0.3) * (aspect >= 1 ? 1 : 0.62),
        color: COLORS[i % COLORS.length],
      };
    });
  }, [tier, aspect]);

  useFrame((state) => {
    const { hero, journey } = useLandingStore.getState();
    // Names stay hidden behind the hero and emerge as the visitor scrolls into the journey.
    const presence = MathUtils.smoothstep(hero + journey * 4, 0.35, 1);
    const camZ = state.camera.position.z;

    items.forEach((item, i) => {
      const text = refs.current[i];
      if (!text) return;
      const ahead = camZ - item.position[2];
      // Fade in from the fog, and out just before the name passes the lens.
      const near = MathUtils.smoothstep(ahead, 0.4, 2.4);
      const far = 1 - MathUtils.smoothstep(ahead, 16, 26);
      text.fillOpacity = presence * near * far;
      text.visible = text.fillOpacity > 0.01;
    });
  });

  return (
    <group>
      {items.map((item, i) => (
        <Text
          key={item.brand.slug}
          ref={(node: TroikaText | null) => {
            refs.current[i] = node;
          }}
          font={FONT_URL}
          position={item.position}
          fontSize={item.size}
          letterSpacing={0.16}
          color={item.color}
          anchorX="center"
          anchorY="middle"
          sdfGlyphSize={tier === "high" ? 64 : 32}
        >
          {item.brand.name.toUpperCase()}
          <meshBasicMaterial transparent depthWrite={false} toneMapped={false} fog />
        </Text>
      ))}
    </group>
  );
}
