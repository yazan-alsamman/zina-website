import { CylinderGeometry, LatheGeometry, Vector2 } from "three";

const lathe = (profile: Array<[number, number]>, segments: number) =>
  new LatheGeometry(
    profile.map(([x, y]) => new Vector2(x, y)),
    segments,
  );

/** Lacquered lipstick case: a softly bevelled tube. Origin at its base. */
export function lipstickCase(segments: number) {
  return lathe(
    [
      [0, 0],
      [0.25, 0],
      [0.28, 0.015],
      [0.292, 0.05],
      [0.292, 0.7],
      [0.282, 0.74],
      [0.26, 0.755],
      [0, 0.755],
    ],
    segments,
  );
}

/** Metal sleeve that the bullet rises from. */
export function lipstickSleeve(segments: number) {
  return lathe(
    [
      [0, 0.74],
      [0.236, 0.74],
      [0.242, 0.76],
      [0.242, 1.02],
      [0.226, 1.045],
      [0, 1.045],
    ],
    segments,
  );
}

/** The bullet, with the classic slanted cut carved into the turned profile. */
export function lipstickBullet(segments: number) {
  const r = 0.19;
  const geometry = lathe(
    [
      [0, 1.0],
      [r, 1.0],
      [r, 1.42],
      [r * 0.92, 1.5],
      [r * 0.6, 1.57],
      [0, 1.6],
    ],
    segments,
  );

  // Slice with an inclined plane: high on one side (-x), low on the other (+x).
  const low = 1.3;
  const rise = 0.27;
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const top = low + (rise * (r - x)) / (2 * r);
    if (positions.getY(i) > top) positions.setY(i, top);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** Lipstick cap, closed at the top. */
export function lipstickCap(segments: number) {
  return lathe(
    [
      [0, 0],
      [0.3, 0],
      [0.312, 0.03],
      [0.312, 0.79],
      [0.296, 0.825],
      [0, 0.83],
    ],
    segments,
  );
}

/** Faceted perfume body: an octagonal prism, slightly tapered. */
export function perfumeBody() {
  return new CylinderGeometry(0.6, 0.68, 1.2, 8, 1);
}

export function perfumeJuice() {
  return new CylinderGeometry(0.49, 0.55, 0.74, 8, 1);
}

export function perfumeNeck(segments: number) {
  return new CylinderGeometry(0.13, 0.16, 0.16, segments);
}

/** Hexagonal faceted stopper. */
export function perfumeCap() {
  return new CylinderGeometry(0.33, 0.36, 0.52, 6, 1);
}

/** Compact half-shell (base or lid): a rounded disc. */
export function compactShell(segments: number) {
  return lathe(
    [
      [0, 0],
      [0.55, 0],
      [0.6, 0.015],
      [0.622, 0.055],
      [0.622, 0.11],
      [0.6, 0.14],
      [0, 0.14],
    ],
    segments,
  );
}
