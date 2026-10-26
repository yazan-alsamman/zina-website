// Brand tokens (src/app/globals.css) for use inside the WebGL scene.
export const palette = {
  white: "#ffffff",
  mist: "#eaeaea",
  sand: "#b8a48f",
  sand100: "#f1ede9",
  sand200: "#dcd2c7",
  sand700: "#7c6c5e",
  mocha: "#4a3f35",
  mocha800: "#342c25",
  mocha900: "#211c18",
} as const;

/** Visible frustum height at z = 0 for the hero camera (fov 35°, distance 9). */
export const HERO_CAMERA_Z = 9;
export const HERO_FOV = 35;
export const HERO_VIEW_HEIGHT = 2 * HERO_CAMERA_Z * Math.tan(((HERO_FOV / 2) * Math.PI) / 180);
