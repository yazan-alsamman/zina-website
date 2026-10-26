/**
 * Beauty houses shown in the landing "constellation".
 *
 * Names are rendered as typographic wordmarks, never as official logo artwork. When a house
 * authorises its logo, add it as `logoSvg` (inline SVG markup or a /public path) and the UI can
 * switch to it. The shape mirrors the Prisma `Brand` model so this list can later be read from
 * the database instead.
 */
export type BrandEntry = {
  name: string;
  slug: string;
  /** Authorised logo (SVG markup or /public path). Optional until permission is granted. */
  logoSvg?: string;
  /** Lower number = shown even on low-power devices. */
  priority: 1 | 2;
};

export const brands: readonly BrandEntry[] = [
  { name: "Dior", slug: "dior", priority: 1 },
  { name: "Chanel", slug: "chanel", priority: 1 },
  { name: "Lancôme", slug: "lancome", priority: 1 },
  { name: "Estée Lauder", slug: "estee-lauder", priority: 1 },
  { name: "YSL Beauty", slug: "ysl-beauty", priority: 1 },
  { name: "Givenchy", slug: "givenchy", priority: 2 },
  { name: "Armani Beauty", slug: "armani-beauty", priority: 2 },
  { name: "MAC", slug: "mac", priority: 1 },
  { name: "NARS", slug: "nars", priority: 2 },
  { name: "Clinique", slug: "clinique", priority: 2 },
  { name: "Charlotte Tilbury", slug: "charlotte-tilbury", priority: 1 },
  { name: "Fenty Beauty", slug: "fenty-beauty", priority: 1 },
  { name: "Rare Beauty", slug: "rare-beauty", priority: 2 },
  { name: "Huda Beauty", slug: "huda-beauty", priority: 1 },
  { name: "Guerlain", slug: "guerlain", priority: 2 },
  { name: "La Mer", slug: "la-mer", priority: 1 },
];
