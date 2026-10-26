import {
  Cormorant_Garamond,
  IBM_Plex_Sans_Arabic,
  Jost,
  Noto_Naskh_Arabic,
} from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

// Arabic faces only carry the Arabic subset; Latin glyphs fall back to Cormorant/Jost.
// Not preloaded so English pages don't pay for them.
const naskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-naskh",
  display: "swap",
  preload: false,
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-plex-arabic",
  display: "swap",
  preload: false,
});

export const fontVariables = [cormorant, jost, naskh, plexArabic]
  .map((font) => font.variable)
  .join(" ");
