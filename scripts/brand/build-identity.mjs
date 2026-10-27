// Builds the official identity, concept 1 "Maison" (public/brand/concepts/1), for use on the site:
//
//   node scripts/brand/build-identity.mjs
//
// Writes
//   src/components/brand/maison.generated.ts   path data and lockup layouts for <Logo />
//   public/brand/*.svg                         logo files (light, night, mono, Arabic, mark)
//   public/brand/email-logo.png                the header of the order emails
//   public/icons/*.png                         web manifest icons (192, 512, maskable 512)
//   src/app/icon.svg, icon1.png, icon2.png     favicons (SVG, 32 and 16 px)
//   src/app/apple-icon.png, favicon.ico        home screen icon (180 px) and legacy favicon
//
// The drawing is the same as the concept files; only the layouts are added here (a horizontal
// Arabic lockup for the header, night versions, raster icons).

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { arch, didoneZ, MOCHA, root, round, SAND, setText, WHITE } from "./lib.mjs";

const SAND_200 = "#dcd2c7";

// ---------------------------------------------------------------------------------------------
// The drawing (identical to concept 1)

const MARK_W = 120;
const MARK_H = 168;
const ARCH = arch(60, 12, 92, 160);
const Z = didoneZ(36, 52, 48, 72, { hair: 2.6, stem: 15, serif: 11 });
// Small sizes (favicons): heavier hairlines, no arch.
const SMALL_Z = didoneZ(19, 15, 26, 34, { hair: 3.4, stem: 9, serif: 6.5 });

/** Shaped text moved so its bounding box starts at (0, 0). */
function normalised(set) {
  const dx = -set.bbox.minX;
  const dy = -set.bbox.minY;
  const move = (d) => {
    let i = 0;
    return d.replace(/-?\d*\.?\d+/g, (n) => String(round(Number(n) + (i++ % 2 === 0 ? dx : dy))));
  };
  return {
    width: round(set.bbox.maxX - set.bbox.minX),
    height: round(set.bbox.maxY - set.bbox.minY),
    /** Distance from the top of the box to the baseline. */
    ascent: round(-set.bbox.minY),
    glyphs: set.glyphs.filter((g) => g.d).map((g) => move(g.d)),
  };
}

const latin = normalised(
  setText("CormorantGaramond-Regular.ttf", "ZINA AL MOKRI", { size: 25, tracking: 0.34 }),
);
const arabicSet = normalised(setText("NotoNaskhArabic-Medium.ttf", "زينة المقري", { size: 40 }));
// Joined script is revealed as one piece: a single path.
const arabic = { ...arabicSet, glyphs: [arabicSet.glyphs.join(" ")] };

// ---------------------------------------------------------------------------------------------
// Lockups. Positions in each lockup's own units; `scale` applies to the mark or the word.

const H_SCALE = 0.42; // the mark in horizontal lockups
const H_GAP = 22;
const hMarkW = MARK_W * H_SCALE;
const hH = MARK_H * H_SCALE;

function stacked(word, wordTop, bottomPad) {
  const width = Math.max(MARK_W, word.width) + 40;
  return {
    width: round(width),
    height: round(wordTop + word.height + bottomPad),
    mark: { x: round((width - MARK_W) / 2), y: 0, scale: 1 },
    word: { x: round((width - word.width) / 2), y: round(wordTop), scale: 1 },
    archWidth: 1.4,
  };
}

const AR_H_SCALE = 0.72;
const layouts = {
  // Name centred under the arch (as concept 1 primary): baseline 44 below the mark.
  stacked: stacked(latin, MARK_H + 44 - latin.ascent, 8 - (latin.height - latin.ascent)),
  stackedArabic: stacked(arabic, MARK_H + 34, 22 - (arabic.height - arabic.ascent)),
  // Mark first, name beside it, its caps centred a little below the middle of the arch.
  horizontal: {
    width: round(hMarkW + H_GAP + latin.width + 6),
    height: round(hH),
    mark: { x: 0, y: 0, scale: H_SCALE },
    word: { x: round(hMarkW + H_GAP), y: round(hH * 0.58 - latin.height / 2), scale: 1 },
    archWidth: 2.6,
  },
  // Right to left: the mark leads on the right.
  horizontalArabic: {
    width: round(4 + arabic.width * AR_H_SCALE + H_GAP + hMarkW),
    height: round(hH),
    mark: { x: round(4 + arabic.width * AR_H_SCALE + H_GAP), y: 0, scale: H_SCALE },
    word: {
      x: 4,
      y: round(hH * 0.6 - arabic.ascent * AR_H_SCALE * 0.78),
      scale: AR_H_SCALE,
    },
    archWidth: 2.6,
  },
};

// ---------------------------------------------------------------------------------------------
// SVG output

const INK = `var(--logo-ink,${MOCHA})`;
const ACCENT = `var(--logo-accent,${SAND})`;

const at = ({ x, y, scale }) =>
  `translate(${x} ${y})${scale === 1 ? "" : ` scale(${round(scale)})`}`;

function markBody({ ink, accent, archWidth }) {
  return `<path d="${ARCH}" style="fill:none;stroke:${ink};stroke-width:${archWidth};stroke-linecap:round"/>
<path d="${Z.body}" style="fill:${ink}"/>
<path d="${Z.cross}" style="fill:${accent}"/>`;
}

function lockup(layout, word, { ink = INK, accent = ACCENT } = {}) {
  return `<g transform="${at(layout.mark)}">${markBody({ ink, accent, archWidth: layout.archWidth })}</g>
<g transform="${at(layout.word)}" style="fill:${ink}">${word.glyphs.map((d) => `<path d="${d}"/>`).join("")}</g>`;
}

function svgFile({ width, height, title, body, lang, size }) {
  const dims = size ? ` width="${size.width}" height="${size.height}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"${dims} role="img" aria-label="${title}"${lang ? ` lang="${lang}"` : ""}>
${body}
</svg>
`;
}

const NAME = "Zina Al Mokri";
const NAME_AR = "زينة المقري";
const night = { ink: WHITE, accent: SAND_200 };
const mono = { ink: "currentColor", accent: "currentColor" };

function put(path, content) {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

const files = {
  "logo.svg": [layouts.stacked, latin, {}, NAME],
  "logo-night.svg": [layouts.stacked, latin, night, NAME],
  "logo-mono.svg": [layouts.stacked, latin, mono, NAME],
  "logo-arabic.svg": [layouts.stackedArabic, arabic, {}, NAME_AR, "ar"],
  "logo-arabic-night.svg": [layouts.stackedArabic, arabic, night, NAME_AR, "ar"],
  "logo-horizontal.svg": [layouts.horizontal, latin, {}, NAME],
  "logo-horizontal-night.svg": [layouts.horizontal, latin, night, NAME],
  "logo-horizontal-arabic.svg": [layouts.horizontalArabic, arabic, {}, NAME_AR, "ar"],
};
for (const [name, [layout, word, colors, title, lang]] of Object.entries(files)) {
  put(
    `public/brand/${name}`,
    svgFile({ ...layout, title, lang, body: lockup(layout, word, colors) }),
  );
}
put(
  "public/brand/mark.svg",
  svgFile({
    width: MARK_W,
    height: MARK_H,
    title: NAME,
    body: markBody({ ink: INK, accent: ACCENT, archWidth: 1.4 }),
  }),
);

// ---------------------------------------------------------------------------------------------
// Icons

/** The small Ƶ on a mocha tile (favicons). */
function smallIcon(px) {
  return svgFile({
    width: 64,
    height: 64,
    title: NAME,
    size: px && { width: px, height: px },
    body: `<rect width="64" height="64" rx="13" style="fill:${MOCHA}"/>
<path d="${SMALL_Z.body}" style="fill:${WHITE}"/>
<path d="${SMALL_Z.cross}" style="fill:${SAND}"/>`,
  });
}

/**
 * The arch and Ƶ on a mocha square (home screen and manifest icons). `fill` is the share of the
 * height the arch takes; the maskable icon keeps it inside the 80% safe circle.
 */
function largeIcon(px, { fill, radius = 0 }) {
  const s = (fill * 512) / 148; // the arch spans y 12..160
  const tx = 256 - 60 * s;
  const ty = 256 - 86 * s;
  return svgFile({
    width: 512,
    height: 512,
    title: NAME,
    size: { width: px, height: px },
    body: `<rect width="512" height="512" rx="${radius}" style="fill:${MOCHA}"/>
<g transform="translate(${round(tx)} ${round(ty)}) scale(${round(s)})">${markBody({ ink: WHITE, accent: SAND, archWidth: 2.6 })}</g>`,
  });
}

const png = (svg) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();

/** An .ico holding PNG images (supported by every browser since Windows Vista era). */
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4); // colour planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

put("src/app/icon.svg", smallIcon());
put("src/app/icon1.png", await png(smallIcon(32)));
put("src/app/icon2.png", await png(smallIcon(16)));
put(
  "src/app/favicon.ico",
  ico(
    await Promise.all(
      [16, 32, 48].map(async (size) => ({ size, data: await png(smallIcon(size)) })),
    ),
  ),
);
put("src/app/apple-icon.png", await png(largeIcon(180, { fill: 0.66 })));
put("public/icons/icon-192.png", await png(largeIcon(192, { fill: 0.62, radius: 96 })));
put("public/icons/icon-512.png", await png(largeIcon(512, { fill: 0.62, radius: 96 })));
put("public/icons/maskable-512.png", await png(largeIcon(512, { fill: 0.6 })));

// Email header: the horizontal lockup at 3× its 200 px display width, on transparent.
{
  const { width, height } = layouts.horizontal;
  const px = { width: 600, height: Math.round((600 * height) / width) };
  put(
    "public/brand/email-logo.png",
    await png(
      svgFile({
        width,
        height,
        title: NAME,
        size: px,
        body: lockup(layouts.horizontal, latin, { ink: MOCHA, accent: SAND }),
      }),
    ),
  );
}

// ---------------------------------------------------------------------------------------------
// React data

const ts = `// Generated by scripts/brand/build-identity.mjs from the brand typefaces. Do not edit by hand.

/** The Maison identity: arch, Ƶ and the two wordmarks, with the lockup layouts. */
export const MAISON = ${JSON.stringify(
  {
    mark: {
      width: MARK_W,
      height: MARK_H,
      arch: ARCH,
      z: Z.body,
      cross: Z.cross,
    },
    latin,
    arabic,
    layouts,
  },
  null,
  2,
)} as const;

export type MaisonLayout = keyof typeof MAISON.layouts;
`;
put("src/components/brand/maison.generated.ts", ts);

console.log("Maison identity written (public/brand, public/icons, src/app icons, <Logo /> data).");
