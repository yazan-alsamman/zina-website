// Shared drawing helpers for the brand scripts (build-logos.mjs, build-identity.mjs).
//
// Colours: two CSS variables with brand fallbacks, so the same file renders mocha/sand on light
// grounds and can be re-tinted when inlined on mocha:
//   --logo-ink (default mocha #4a3f35), --logo-accent (default sand #b8a48f).
// The mono files use currentColor for everything.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as hb from "harfbuzzjs";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const out = join(root, "public", "brand", "concepts");

export const MOCHA = "#4a3f35";
export const SAND = "#b8a48f";
export const WHITE = "#ffffff";
export const INK = `var(--logo-ink,${MOCHA})`;
export const ACCENT = `var(--logo-accent,${SAND})`;

// ---------------------------------------------------------------------------------------------
// Text → outlines

const fonts = new Map();
export function font(file) {
  if (!fonts.has(file)) {
    const data = readFileSync(join(root, "scripts", "brand", "fonts", file));
    const face = new hb.Face(
      new hb.Blob(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)),
    );
    fonts.set(file, { face, font: new hb.Font(face), upem: face.upem });
  }
  return fonts.get(file);
}

export const round = (n) => Math.round(n * 100) / 100;

/** Transforms a HarfBuzz path (font units, y up) to SVG user units at (x, baseline), scale k. */
export function placePath(d, x, baseline, k, bbox) {
  const tokens = d.match(/[MLQCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  let result = "";
  let pending = [];
  for (const token of tokens) {
    if (/[MLQCZ]/i.test(token)) {
      result += token;
      pending = [];
      continue;
    }
    pending.push(Number(token));
    if (pending.length === 2) {
      const px = round(x + pending[0] * k);
      const py = round(baseline - pending[1] * k);
      if (bbox) {
        bbox.minX = Math.min(bbox.minX, px);
        bbox.maxX = Math.max(bbox.maxX, px);
        bbox.minY = Math.min(bbox.minY, py);
        bbox.maxY = Math.max(bbox.maxY, py);
      }
      result += `${result.endsWith(" ") || /[MLQCZ]$/i.test(result) ? "" : " "}${px} ${py} `;
      pending = [];
    }
  }
  return result.replace(/\s+/g, " ").trim();
}

/**
 * Shapes `text` and returns its glyph outlines placed on a baseline at y = 0, starting at x = 0.
 * Latin can be letter-spaced (`tracking`, in em); Arabic is never tracked.
 */
export function setText(file, text, { size, tracking = 0 }) {
  const { font: hbFont, upem } = font(file);
  const buffer = new hb.Buffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  hb.shape(hbFont, buffer);
  const infos = buffer.getGlyphInfos();
  const positions = buffer.getGlyphPositions();
  const k = size / upem;
  const glyphs = [];
  let pen = 0;
  const bbox = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };

  infos.forEach((info, i) => {
    const p = positions[i];
    const raw = hbFont.glyphToPath(info.codepoint);
    const gx = pen + p.xOffset * k;
    const gb = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    const d = raw ? placePath(raw, gx, -p.yOffset * k, k, gb) : "";
    if (d) {
      bbox.minX = Math.min(bbox.minX, gb.minX);
      bbox.maxX = Math.max(bbox.maxX, gb.maxX);
      bbox.minY = Math.min(bbox.minY, gb.minY);
      bbox.maxY = Math.max(bbox.maxY, gb.maxY);
    }
    glyphs.push({
      d,
      cluster: info.cluster,
      x: gx,
      advance: p.xAdvance * k,
      bbox: gb,
      isMark: p.xAdvance === 0,
    });
    pen += p.xAdvance * k;
    if (p.xAdvance > 0 && i < infos.length - 1) pen += tracking * size;
  });
  // Trailing tracking is not part of the visual width.
  return { glyphs, bbox, width: bbox.maxX - bbox.minX };
}

/** Moves already-placed path data by (dx, dy). */
export function shift(d, dx, dy) {
  let i = 0;
  return d.replace(/-?\d*\.?\d+/g, (n) => String(round(Number(n) + (i++ % 2 === 0 ? dx : dy))));
}

// ---------------------------------------------------------------------------------------------
// Hand-drawn marks

/**
 * Concept 1: a Didone "Ƶ". Hairline bars with cupped wedge serifs, one heavy diagonal, and the
 * continental cross-stroke (in sand) through its middle. Box (x, y, w, h).
 */
export function didoneZ(x, y, w, h, { hair, stem, serif }) {
  const r = x + w;
  const b = y + h;
  const parts = [
    // top bar and its left serif, cupped towards the bar
    `M${x} ${y}H${r}V${y + hair}H${x + hair}V${y + serif}`,
    `C${x + hair * 0.15} ${y + serif * 0.45} ${x - hair * 0.05} ${y + hair * 1.6} ${x} ${y + hair}Z`,
    // the diagonal: wide at the top right, narrowing slightly into the bottom left
    `M${r - stem} ${y + hair}H${r}L${x + stem * 0.92} ${b - hair}H${x}Z`,
    // bottom bar and its right serif
    `M${x} ${b - hair}H${r - hair}V${b - serif}`,
    `C${r - hair * 0.15} ${b - serif * 0.45} ${r + hair * 0.05} ${b - hair * 1.6} ${r} ${b - hair}V${b}H${x}Z`,
  ];
  const cross = { x: x + w * 0.2, y: y + h / 2 - hair * 0.45, w: w * 0.6, h: hair * 0.9 };
  return {
    body: parts.join("").replace(/(\d)([A-Z])/g, "$1 $2"),
    cross: `M${round(cross.x)} ${round(cross.y)}h${round(cross.w)}v${round(cross.h)}h${round(-cross.w)}Z`,
  };
}

/** A doorway / mirror arch, open at the bottom. */
export function arch(cx, top, width, bottom) {
  const r = width / 2;
  const left = cx - r;
  const right = cx + r;
  const springing = top + r;
  return `M${round(left)} ${round(bottom)}V${round(springing)}A${round(r)} ${round(r)} 0 0 1 ${round(right)} ${round(springing)}V${round(bottom)}`;
}

/**
 * Concept 2: one continuous line. It falls from above (the dropper, in sand), meets the tip of
 * the drop and draws its whole contour, ending back at the tip.
 */
export function droplet(cx, tip, r, trail) {
  const cy = tip + r * 2.25;
  const trailPath = `M${cx} ${round(tip - trail)}V${tip}`;
  const contour = [
    `M${cx} ${tip}`,
    `C${round(cx + r * 0.18)} ${round(tip + r * 0.55)} ${round(cx + r)} ${round(cy - r * 1.05)} ${round(cx + r)} ${round(cy)}`,
    `A${r} ${r} 0 0 1 ${round(cx - r)} ${round(cy)}`,
    `C${round(cx - r)} ${round(cy - r * 1.05)} ${round(cx - r * 0.18)} ${round(tip + r * 0.55)} ${cx} ${tip}`,
  ].join("");
  return { trailPath, contour, bottom: cy + r, cy };
}

/** Concept 3: the beauty mark, a slim lozenge. */
export function lozenge(cx, cy, w, h) {
  return `M${round(cx)} ${round(cy - h / 2)}L${round(cx + w / 2)} ${round(cy)}L${round(cx)} ${round(cy + h / 2)}L${round(cx - w / 2)} ${round(cy)}Z`;
}

// ---------------------------------------------------------------------------------------------
// SVG writing

export function svg({ width, height, title, body, mono = false, background }) {
  const content = mono
    ? body.replaceAll(INK, "currentColor").replaceAll(ACCENT, "currentColor")
    : body;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round(width)} ${round(height)}" role="img" aria-labelledby="t">
<title id="t">${title}</title>
${background ?? ""}${content}
</svg>
`;
}

export const fill = (d, color = INK) => `<path d="${d}" style="fill:${color}"/>\n`;
export const stroke = (d, width, color = INK) =>
  `<path d="${d}" style="fill:none;stroke:${color};stroke-width:${width};stroke-linecap:round;stroke-linejoin:round"/>\n`;

export function write(concept, name, content) {
  const dir = join(out, String(concept));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), content);
}

export function emit(concept, files) {
  for (const [name, content] of Object.entries(files)) write(concept, name, content);
}

/** Text glyphs as one path (or per-glyph colours via `colorOf`). */
export function textPaths(set, dx, dy, colorOf = () => INK) {
  return set.glyphs
    .filter((g) => g.d)
    .map((g) => fill(shift(g.d, dx, dy), colorOf(g)))
    .join("");
}

export const favicon = (body) =>
  svg({
    width: 64,
    height: 64,
    title: "Zina Al Mokri",
    background: `<rect width="64" height="64" rx="13" style="fill:${MOCHA}"/>\n`,
    body,
  });
