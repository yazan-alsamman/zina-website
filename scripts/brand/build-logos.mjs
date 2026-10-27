// Builds the three logo concepts in public/brand/concepts/{1,2,3}/.
//
//   node scripts/brand/build-logos.mjs
//
// Lettering is shaped with HarfBuzz (correct Arabic joining, kerning) from the brand's own
// typefaces (scripts/brand/fonts, SIL OFL) and written out as outlines, so the SVGs need no web
// fonts. The marks themselves are drawn here by hand: the arch-framed Ƶ monogram, the droplet
// line and the beauty-mark lozenge.
//
// Colours: two CSS variables with brand fallbacks, so the same file renders mocha/sand on light
// grounds and can be re-tinted when inlined on mocha:
//   --logo-ink (default mocha #4a3f35), --logo-accent (default sand #b8a48f).
// The mono files use currentColor for everything.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as hb from "harfbuzzjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = join(root, "public", "brand", "concepts");

const MOCHA = "#4a3f35";
const SAND = "#b8a48f";
const WHITE = "#ffffff";
const INK = `var(--logo-ink,${MOCHA})`;
const ACCENT = `var(--logo-accent,${SAND})`;

// ---------------------------------------------------------------------------------------------
// Text → outlines

const fonts = new Map();
function font(file) {
  if (!fonts.has(file)) {
    const data = readFileSync(join(root, "scripts", "brand", "fonts", file));
    const face = new hb.Face(
      new hb.Blob(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)),
    );
    fonts.set(file, { face, font: new hb.Font(face), upem: face.upem });
  }
  return fonts.get(file);
}

const round = (n) => Math.round(n * 100) / 100;

/** Transforms a HarfBuzz path (font units, y up) to SVG user units at (x, baseline), scale k. */
function placePath(d, x, baseline, k, bbox) {
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
function setText(file, text, { size, tracking = 0 }) {
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
function shift(d, dx, dy) {
  let i = 0;
  return d.replace(/-?\d*\.?\d+/g, (n) => String(round(Number(n) + (i++ % 2 === 0 ? dx : dy))));
}

// ---------------------------------------------------------------------------------------------
// Hand-drawn marks

/**
 * Concept 1: a Didone "Ƶ". Hairline bars with cupped wedge serifs, one heavy diagonal, and the
 * continental cross-stroke (in sand) through its middle. Box (x, y, w, h).
 */
function didoneZ(x, y, w, h, { hair, stem, serif }) {
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
function arch(cx, top, width, bottom) {
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
function droplet(cx, tip, r, trail) {
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
function lozenge(cx, cy, w, h) {
  return `M${round(cx)} ${round(cy - h / 2)}L${round(cx + w / 2)} ${round(cy)}L${round(cx)} ${round(cy + h / 2)}L${round(cx - w / 2)} ${round(cy)}Z`;
}

// ---------------------------------------------------------------------------------------------
// SVG writing

function svg({ width, height, title, body, mono = false, background }) {
  const content = mono
    ? body.replaceAll(INK, "currentColor").replaceAll(ACCENT, "currentColor")
    : body;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round(width)} ${round(height)}" role="img" aria-labelledby="t">
<title id="t">${title}</title>
${background ?? ""}${content}
</svg>
`;
}

const fill = (d, color = INK) => `<path d="${d}" style="fill:${color}"/>\n`;
const stroke = (d, width, color = INK) =>
  `<path d="${d}" style="fill:none;stroke:${color};stroke-width:${width};stroke-linecap:round;stroke-linejoin:round"/>\n`;

function write(concept, name, content) {
  const dir = join(out, String(concept));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), content);
}

function emit(concept, files) {
  for (const [name, content] of Object.entries(files)) write(concept, name, content);
}

/** Text glyphs as one path (or per-glyph colours via `colorOf`). */
function textPaths(set, dx, dy, colorOf = () => INK) {
  return set.glyphs
    .filter((g) => g.d)
    .map((g) => fill(shift(g.d, dx, dy), colorOf(g)))
    .join("");
}

const favicon = (body) =>
  svg({
    width: 64,
    height: 64,
    title: "Zina Al Mokri",
    background: `<rect width="64" height="64" rx="13" style="fill:${MOCHA}"/>\n`,
    body,
  });

// ---------------------------------------------------------------------------------------------
// Concept 1 · Maison: arch-framed Ƶ with a tracked Cormorant wordmark

{
  const markW = 120;
  const markH = 168;
  // Optically centred in the arch: a little above the geometric middle.
  const z = didoneZ(36, 52, 48, 72, { hair: 2.6, stem: 15, serif: 11 });
  const mark = `${stroke(arch(60, 12, 92, 160), 1.4)}${fill(z.body)}${fill(z.cross, ACCENT)}`;

  const word = setText("CormorantGaramond-Regular.ttf", "ZINA AL MOKRI", {
    size: 25,
    tracking: 0.34,
  });
  const W = Math.max(markW, word.width) + 40;
  const markX = (W - markW) / 2;
  const wordX = (W - word.width) / 2 - word.bbox.minX;
  const wordBase = markH + 44;
  const primary = `<g transform="translate(${round(markX)} 0)">${mark}</g>${textPaths(word, wordX, wordBase)}`;
  const H = wordBase + 8;

  const arabic = setText("NotoNaskhArabic-Medium.ttf", "زينة المقري", { size: 40 });
  const AW = Math.max(markW, arabic.width) + 40;
  const arBase = markH + 40 - arabic.bbox.minY - 6;
  const arabicLockup = `<g transform="translate(${round((AW - markW) / 2)} 0)">${mark}</g>${textPaths(arabic, (AW - arabic.width) / 2 - arabic.bbox.minX, arBase)}`;

  const fz = didoneZ(19, 15, 26, 34, { hair: 3.4, stem: 9, serif: 6.5 });
  const compact = (ink, accent) => `${fill(fz.body, ink)}${fill(fz.cross, accent)}`;
  // Horizontal lockup for the site header: the arch mark at a smaller scale, the name beside it.
  const hScale = 0.42;
  const hGap = 22;
  const capH = word.bbox.maxY - word.bbox.minY;
  const hMarkW = markW * hScale;
  const hH = markH * hScale;
  const hW = hMarkW + hGap + word.width + 6;
  const horizontal = `<g transform="scale(${hScale})">${mark.replaceAll("stroke-width:1.4", "stroke-width:2.6")}</g>${textPaths(word, hMarkW + hGap - word.bbox.minX, hH * 0.58 + capH / 2)}`;
  emit(1, {
    "horizontal.svg": svg({ width: hW, height: hH, title: "Zina Al Mokri", body: horizontal }),
    "compact.svg": svg({
      width: 64,
      height: 64,
      title: "Zina Al Mokri",
      body: compact(INK, ACCENT),
    }),
    "primary.svg": svg({ width: W, height: H, title: "Zina Al Mokri", body: primary }),
    "mono.svg": svg({ width: W, height: H, title: "Zina Al Mokri", body: primary, mono: true }),
    "arabic.svg": svg({ width: AW, height: arBase + 22, title: "زينة المقري", body: arabicLockup }),
    "mark.svg": svg({ width: markW, height: markH, title: "Zina Al Mokri", body: mark }),
    "favicon.svg": favicon(compact(WHITE, SAND)),
  });
}

// ---------------------------------------------------------------------------------------------
// Concept 2 · Goutte: the droplet line beside a light, airy Jost wordmark

{
  const drop = droplet(30, 30, 20, 26);
  const markH = drop.bottom + 4;
  const markW = 60;
  const mark = `${stroke(drop.trailPath, 1.8, ACCENT)}${stroke(drop.contour, 1.8)}`;

  const word = setText("Jost-Light.ttf", "ZINA AL MOKRI", { size: 21, tracking: 0.42 });
  const capH = word.bbox.maxY - word.bbox.minY;
  const gap = 26;
  const W = markW + gap + word.width + 8;
  // Wordmark centred on the body of the drop.
  const base = drop.cy + capH / 2;
  const primary = `${mark}${textPaths(word, markW + gap - word.bbox.minX, base)}`;

  const arabic = setText("IBMPlexSansArabic-Light.ttf", "زينة المقري", { size: 40 });
  const arMid = (arabic.bbox.maxY + arabic.bbox.minY) / 2;
  const AW = arabic.width + gap + markW + 8;
  // Right to left: the mark leads on the right.
  const arabicLockup = `${textPaths(arabic, 8 - arabic.bbox.minX, drop.cy - arMid)}<g transform="translate(${round(AW - markW)} 0)">${mark}</g>`;

  const fd = droplet(32, 12, 11.5, 0);
  const compact = (ink, accent) =>
    `${stroke("M32 4V12", 3.4, accent)}${stroke(fd.contour, 3.4, ink)}`;
  emit(2, {
    "horizontal.svg": svg({ width: W, height: markH, title: "Zina Al Mokri", body: primary }),
    "compact.svg": svg({
      width: 64,
      height: 64,
      title: "Zina Al Mokri",
      body: compact(INK, ACCENT),
    }),
    "primary.svg": svg({ width: W, height: markH, title: "Zina Al Mokri", body: primary }),
    "mono.svg": svg({ width: W, height: markH, title: "Zina Al Mokri", body: primary, mono: true }),
    "arabic.svg": svg({ width: AW, height: markH, title: "زينة المقري", body: arabicLockup }),
    "mark.svg": svg({ width: markW, height: markH, title: "Zina Al Mokri", body: mark }),
    "favicon.svg": favicon(compact(WHITE, SAND)),
  });
}

// ---------------------------------------------------------------------------------------------
// Concept 3 · Grain de beauté: the wordmark alone, the capital I given a beauty mark in sand

{
  const size = 56;
  const word = setText("CormorantGaramond-Medium.ttf", "ZINA AL MOKRI", { size, tracking: 0.14 });
  const capTop = word.bbox.minY;
  const i = word.glyphs[1]; // the I of ZINA
  const iCenter = (i.bbox.minX + i.bbox.maxX) / 2;
  const lozH = size * 0.21;
  const lozY = capTop - size * 0.1 - lozH / 2;
  const pad = 12;
  const dx = pad - word.bbox.minX;
  const dy = pad - (lozY - lozH / 2);
  const W = word.width + pad * 2;
  const H = word.bbox.maxY - (lozY - lozH / 2) + pad * 2;
  const primary = `${textPaths(word, dx, dy)}${fill(lozenge(iCenter + dx, lozY + dy, size * 0.145, lozH), ACCENT)}`;

  // Arabic: the dot of the ن in زينة becomes the beauty mark.
  const arabic = setText("NotoNaskhArabic-Medium.ttf", "زينة المقري", { size: 64 });
  const noonCluster = [..."زينة"].indexOf("ن");
  const apad = 14;
  const adx = apad - arabic.bbox.minX;
  const ady = apad - arabic.bbox.minY;
  const arabicLockup = textPaths(arabic, adx, ady, (g) =>
    g.isMark && g.cluster === noonCluster ? ACCENT : INK,
  );

  // Mark: the Z with its beauty mark, for small sizes.
  const z = setText("CormorantGaramond-Medium.ttf", "Z", { size: 100 });
  const zW = z.width;
  const zH = z.bbox.maxY - z.bbox.minY;
  const markPad = 8;
  const zdx = markPad - z.bbox.minX;
  const zdy = markPad + 14 - z.bbox.minY;
  const markBody = `${textPaths(z, zdx, zdy)}${fill(lozenge(markPad + zW + 6, markPad + 8, 10, 14), ACCENT)}`;

  const fz = setText("CormorantGaramond-Medium.ttf", "Z", { size: 50 });
  const fdx = 32 - fz.width / 2 - fz.bbox.minX - 3;
  const fdy = 34 - (fz.bbox.minY + fz.bbox.maxY) / 2 + 2;
  const compact = (ink, accent) =>
    `${textPaths(fz, fdx, fdy, () => ink)}${fill(lozenge(fdx + fz.bbox.maxX + 4, fdy + fz.bbox.minY - 2, 6, 8.5), accent)}`;
  emit(3, {
    "horizontal.svg": svg({ width: W, height: H, title: "Zina Al Mokri", body: primary }),
    "compact.svg": svg({
      width: 64,
      height: 64,
      title: "Zina Al Mokri",
      body: compact(INK, ACCENT),
    }),
    "primary.svg": svg({ width: W, height: H, title: "Zina Al Mokri", body: primary }),
    "mono.svg": svg({ width: W, height: H, title: "Zina Al Mokri", body: primary, mono: true }),
    "arabic.svg": svg({
      width: arabic.width + apad * 2,
      height: arabic.bbox.maxY - arabic.bbox.minY + apad * 2,
      title: "زينة المقري",
      body: arabicLockup,
    }),
    "mark.svg": svg({
      width: zW + markPad * 2 + 14,
      height: zH + markPad * 2 + 14,
      title: "Zina Al Mokri",
      body: markBody,
    }),
    "favicon.svg": favicon(compact(WHITE, SAND)),
  });
}

console.log("Logo concepts written to public/brand/concepts/{1,2,3}/");
