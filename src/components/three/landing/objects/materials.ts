import { useEffect, useMemo } from "react";
import { Color, MeshPhysicalMaterial, MeshStandardMaterial } from "three";
import type { DeviceTier } from "@/lib/landing-store";
import { palette } from "../palette";

/** One shared set of materials for every hero object; disposed together on unmount. */
export function useHeroMaterials(tier: DeviceTier) {
  const materials = useMemo(() => {
    const high = tier === "high";

    // Deep piano lacquer: a satin mocha base under a mirror-like clear coat, with a warm sheen
    // that lifts the silhouette against the night backdrop.
    const lacquer = new MeshPhysicalMaterial({
      color: palette.mocha,
      roughness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      specularIntensity: 1,
      specularColor: new Color(palette.sand100),
      sheen: 0.35,
      sheenRoughness: 0.5,
      sheenColor: new Color(palette.sand),
      envMapIntensity: 1.7,
    });

    // Brushed champagne gold. Lathe UVs run around the circumference, so anisotropy along U
    // reads as fine turned rings, like machined cosmetic packaging.
    const champagne = new MeshPhysicalMaterial({
      color: palette.sand200,
      metalness: 1,
      roughness: 0.3,
      anisotropy: high ? 0.85 : 0.5,
      anisotropyRotation: 0,
      envMapIntensity: 1.55,
    });

    const bullet = new MeshPhysicalMaterial({
      color: palette.sand,
      roughness: 0.48,
      sheen: 0.6,
      sheenColor: new Color(palette.sand100),
    });

    // Real refraction on capable GPUs; a cheaper clear coat of reflections otherwise.
    const glass = high
      ? new MeshPhysicalMaterial({
          color: palette.white,
          transmission: 1,
          thickness: 0.45,
          ior: 1.45,
          roughness: 0.02,
          attenuationColor: new Color(palette.sand100),
          attenuationDistance: 5,
          specularIntensity: 1,
          envMapIntensity: 2.4,
          iridescence: 0.12,
          clearcoat: 1,
          clearcoatRoughness: 0.02,
          flatShading: true,
        })
      : new MeshPhysicalMaterial({
          color: palette.sand100,
          transparent: true,
          opacity: 0.32,
          roughness: 0.05,
          clearcoat: 1,
          flatShading: true,
          depthWrite: false,
        });

    // The perfume juice glows faintly from within so it reads through the glass.
    const juice = new MeshStandardMaterial({
      color: palette.sand,
      roughness: 0.2,
      emissive: new Color(palette.sand),
      emissiveIntensity: 0.35,
      flatShading: true,
    });

    const powder = new MeshStandardMaterial({ color: palette.sand100, roughness: 0.95 });
    const mirror = new MeshStandardMaterial({
      color: palette.white,
      metalness: 1,
      roughness: 0.03,
    });

    const pearl = new MeshPhysicalMaterial({
      color: palette.sand100,
      roughness: 0.26,
      iridescence: 0.75,
      iridescenceIOR: 1.3,
      sheen: 1,
      sheenColor: new Color(palette.white),
      clearcoat: 0.6,
    });

    const droplet = high
      ? new MeshPhysicalMaterial({
          color: palette.white,
          transmission: 1,
          thickness: 0.35,
          ior: 1.33,
          roughness: 0.02,
        })
      : new MeshPhysicalMaterial({
          color: palette.white,
          transparent: true,
          opacity: 0.4,
          roughness: 0.02,
          clearcoat: 1,
          depthWrite: false,
        });

    return { lacquer, champagne, bullet, glass, juice, powder, mirror, pearl, droplet };
  }, [tier]);

  useEffect(
    () => () => {
      for (const material of Object.values(materials)) material.dispose();
    },
    [materials],
  );

  return materials;
}

export type HeroMaterials = ReturnType<typeof useHeroMaterials>;
