"use client";

import { Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { MathUtils, type Mesh } from "three";
import { useLandingStore } from "@/lib/landing-store";
import { layoutConstellation } from "./constellation-layout";
import { CONSTELLATION_FOCUS, JOURNEY_LENGTH, JOURNEY_START_Z, journeySway } from "./journey";
import { HERO_FOV, palette } from "./palette";

export const FONT_URL = "/fonts/cormorant-garamond-400.woff";
const LOW_TIER_COUNT = 10;
const COLORS = [palette.white, palette.sand200, palette.sand100, palette.sand];

type TroikaText = Mesh & {
  fillOpacity: number;
  textRenderInfo?: { blockBounds: [number, number, number, number] };
};

export function BrandConstellation({ names }: { names: readonly string[] }) {
  const tier = useLandingStore((s) => s.tier);
  const size = useThree((s) => s.size);
  const refs = useRef<Array<TroikaText | null>>([]);

  const items = useMemo(
    () =>
      layoutConstellation({
        names: tier === "high" ? names : names.slice(0, LOW_TIER_COUNT),
        aspect: size.width / size.height,
        viewportHeightPx: size.height,
        fovDeg: HERO_FOV,
        focus: CONSTELLATION_FOCUS,
        startZ: JOURNEY_START_Z,
        travel: JOURNEY_LENGTH,
        sway: journeySway,
      }),
    [names, tier, size.width, size.height],
  );

  useFrame((state) => {
    const { hero, journey } = useLandingStore.getState();
    // Names stay hidden behind the hero and emerge as the visitor scrolls into the journey.
    const presence = MathUtils.smoothstep(hero + journey * 4, 0.35, 1);
    const camZ = state.camera.position.z;

    items.forEach((item, i) => {
      const text = refs.current[i];
      if (!text) return;
      const d = camZ - item.position[2];
      const fadeIn = 1 - MathUtils.smoothstep(d, 15, 24);
      const fadeOut = MathUtils.smoothstep(d, item.fadeOut, item.fadeOutStart);
      text.fillOpacity = presence * fadeIn * fadeOut;
      text.visible = d > 0 && text.fillOpacity > 0.01;
    });
  });

  return (
    <group>
      {items.map((item, i) => (
        <Text
          key={item.name}
          ref={(node: TroikaText | null) => {
            refs.current[i] = node;
          }}
          font={FONT_URL}
          position={item.position}
          fontSize={item.fontSize}
          letterSpacing={0.16}
          color={COLORS[i % COLORS.length]}
          anchorX="center"
          anchorY="middle"
          sdfGlyphSize={tier === "high" ? 64 : 32}
          // The layout plans each name's width from font metrics; if real glyphs run wider,
          // scale the name down so it can never leave its safe frame.
          onSync={(mesh: TroikaText) => {
            const bounds = mesh.textRenderInfo?.blockBounds;
            if (!bounds) return;
            const actual = bounds[2] - bounds[0];
            mesh.scale.setScalar(actual > item.plannedWidth ? item.plannedWidth / actual : 1);
          }}
        >
          {item.name}
          <meshBasicMaterial transparent depthWrite={false} toneMapped={false} fog />
        </Text>
      ))}
    </group>
  );
}
