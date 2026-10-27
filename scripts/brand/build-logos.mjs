// Builds the three logo concepts in public/brand/concepts/{1,2,3}/.
//
//   node scripts/brand/build-logos.mjs
//
// Lettering is shaped with HarfBuzz (correct Arabic joining, kerning) from the brand's own
// typefaces (scripts/brand/fonts, SIL OFL) and written out as outlines, so the SVGs need no web
// fonts. The marks themselves are drawn here by hand: the arch-framed Ƶ monogram, the droplet
// line and the beauty-mark lozenge. Shared helpers and the colour variables live in lib.mjs.

import {
  ACCENT,
  arch,
  didoneZ,
  droplet,
  emit,
  favicon,
  fill,
  INK,
  lozenge,
  round,
  SAND,
  setText,
  stroke,
  svg,
  textPaths,
  WHITE,
} from "./lib.mjs";

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
