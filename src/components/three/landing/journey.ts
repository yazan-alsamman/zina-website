import { HERO_CAMERA_Z } from "./palette";

/** Shared camera choreography, so the rig, the constellation layout and DOF agree exactly. */
export const HERO_DOLLY = 3; // camera eases forward as the hero leaves
export const JOURNEY_LENGTH = 52; // world units travelled through the constellation
export const JOURNEY_START_Z = HERO_CAMERA_Z - HERO_DOLLY;
export const CONSTELLATION_FOCUS = 6.5; // distance at which a house name is sharp
export const CONSTELLATION_FOCUS_RANGE = 1.4; // narrow band: one sharp name at a time

/** A whisper of lateral drift so the flight never feels like a rail. */
export function journeySway(journey: number) {
  return Math.sin(journey * Math.PI * 2) * 0.12;
}
