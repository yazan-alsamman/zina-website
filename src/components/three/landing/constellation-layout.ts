/**
 * Screen-space-first layout for the brand constellation.
 *
 * Every name is designed for the moment it is in focus (camera distance = `focus`): it gets a
 * position inside a safe frame in normalised device coordinates (NDC, -1…1), chosen with a
 * best-candidate (Poisson-disc style) search so it keeps maximum distance from the names that
 * share the screen with it a moment earlier or later. Guarantees:
 *  - a name is fully on screen while visible: it fades out before its outer edge, which grows
 *    outward as the camera approaches, reaches 95 % of the viewport;
 *  - names never enter the lower half of the frame, where the section's HTML copy lives;
 *  - names are spaced along the camera path so only one is sharp (in the DOF band) at a time.
 * Pure and deterministic, so it is unit tested and identical on every visit.
 */

export type ConstellationInput = {
  names: readonly string[];
  aspect: number; // viewport width / height
  viewportHeightPx: number;
  fovDeg: number;
  focus: number; // camera distance at which a name is sharp
  startZ: number; // camera z when the journey begins
  travel: number; // world units the camera travels over the journey
  sway: (journey: number) => number; // camera x offset along the journey
};

export type PlacedName = {
  name: string;
  position: [number, number, number];
  fontSize: number; // world units
  plannedWidth: number; // world units at fontSize, used to correct estimate errors after layout
  fadeOut: number; // camera distance where the name is fully gone (never clipped before)
  fadeOutStart: number; // camera distance where fading out begins (≥ focus, stays sharp)
  ndc: { u: number; v: number; hw: number; hh: number }; // in-focus rectangle
};

const U_MAX = 0.86; // horizontal safe frame (NDC)
const V_MIN = 0.12; // names stay above this line: the copy block lives below the centre
const V_MAX = 0.8;
const EDGE = 0.95; // fade out before the outer edge reaches this NDC
const CHAR_EM = 0.9; // average advance per glyph for tracked Cormorant capitals
const CAP_EM = 0.72;
const CANDIDATES = 36;

// Deterministic pseudo-random sequence.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rect = { u: number; v: number; hw: number; hh: number };

/** Signed separation between two rectangles (positive = gap, negative = overlap). */
export function rectGap(a: Rect, b: Rect): number {
  return Math.max(Math.abs(a.u - b.u) - (a.hw + b.hw), Math.abs(a.v - b.v) - (a.hh + b.hh));
}

/** How an in-focus rectangle appears when the name is at camera distance `d` instead. */
function atDistance(r: Rect, focus: number, d: number): Rect {
  const s = focus / d;
  return { u: r.u * s, v: r.v * s, hw: r.hw * s, hh: r.hh * s };
}

export function layoutConstellation(input: ConstellationInput): PlacedName[] {
  const { names, aspect, viewportHeightPx, fovDeg, focus, startZ, travel, sway } = input;
  const n = names.length;
  if (n === 0) return [];

  const tanHalf = Math.tan(((fovDeg / 2) * Math.PI) / 180);
  const halfH = focus * tanHalf; // world half-height of the frame at focus distance
  const halfW = halfH * aspect;
  const widthPx = viewportHeightPx * aspect;

  // Journey moments when each name is in focus, evenly spread with breathing room at both ends.
  const j0 = 0.08;
  const j1 = 0.92;
  const step = n > 1 ? (j1 - j0) / (n - 1) : 0;
  const spacing = step * travel; // world distance between consecutive names along the path

  // Portrait screens can afford proportionally larger names (they have the height).
  const basePx = Math.min(viewportHeightPx * 0.055, widthPx * (aspect < 1 ? 0.11 : 0.075));
  const maxWidthPx = widthPx * (aspect < 1 ? 0.8 : 0.6);

  const random = mulberry32(0x5a17a);
  const placed: PlacedName[] = [];

  for (let i = 0; i < n; i++) {
    const name = names[i].toUpperCase();
    const glyphs = [...name].length;
    const fontPx = Math.min(basePx, maxWidthPx / (glyphs * CHAR_EM));
    const hw = (glyphs * CHAR_EM * fontPx) / widthPx; // half-width in NDC = full px / full px-width
    const hh = (fontPx * CAP_EM) / viewportHeightPx;

    let best: Rect | null = null;
    let bestScore = -Infinity;

    for (let c = 0; c < CANDIDATES; c++) {
      const span = Math.max(U_MAX - hw, 0);
      const cand: Rect = {
        u: (random() * 2 - 1) * span,
        v: V_MIN + hh + random() * Math.max(V_MAX - V_MIN - 2 * hh, 0),
        hw,
        hh,
      };

      let score = Infinity;
      for (let back = 1; back <= 3 && i - back >= 0; back++) {
        const other = placed[i - back];
        const otherRect: Rect = other.ndc;
        // While this name is in focus, the earlier one is `back` steps closer to the camera.
        const dOther = focus - back * spacing;
        if (dOther > other.fadeOut) {
          score = Math.min(score, rectGap(cand, atDistance(otherRect, focus, dOther)));
        }
        // While the earlier one was in focus, this one was further away (smaller, nearer centre).
        score = Math.min(
          score,
          rectGap(otherRect, atDistance(cand, focus, focus + back * spacing)),
        );
      }
      // Light preference for the centre third so the composition does not hug the edges.
      score -= Math.abs(cand.u) * 0.04;

      if (score > bestScore) {
        bestScore = score;
        best = cand;
      }
    }

    const rect = best!;
    const journey = j0 + i * step;
    const camZ = startZ - journey * travel;
    // Distance where the outer edge would reach EDGE (the rectangle grows outward as d shrinks).
    const edgeD = Math.max((Math.abs(rect.u) + rect.hw) / EDGE, (rect.v + rect.hh) / EDGE) * focus;
    // Also leave the stage before the next name arrives in focus.
    const fadeOut = Math.max(edgeD, focus - spacing * 0.7);
    const fadeOutStart = Math.max(fadeOut + 0.35, focus - 0.05);

    const fontSize = (fontPx / viewportHeightPx) * 2 * halfH;
    placed.push({
      name,
      position: [sway(journey) + rect.u * halfW, rect.v * halfH, camZ - focus],
      fontSize,
      plannedWidth: rect.hw * 2 * halfW,
      fadeOut,
      fadeOutStart,
      ndc: rect,
    });
  }

  return placed;
}
