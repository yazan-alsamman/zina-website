import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { uploadRoot } from "./storage";
import type { RasterType } from "./validate";

export const RESPONSIVE_WIDTHS = [480, 960, 1600, 2400] as const;
const MAX_INPUT_PIXELS = 80_000_000; // guards against decompression bombs

export type ProcessedImage = {
  dir: string;
  original: string;
  mime: RasterType;
  width: number;
  height: number;
  bytes: number;
  lqip: string;
  widths: number[];
};

const ORIGINAL_EXT: Record<RasterType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

function newId() {
  return randomBytes(9)
    .toString("base64url")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "x");
}

/**
 * Normalises an uploaded image and writes all renditions:
 *  - applies EXIF orientation, then drops all metadata (EXIF/GPS/XMP/ICC) — sharp strips by
 *    default unless asked to keep it;
 *  - keeps a stripped, re-encoded original in its own format;
 *  - AVIF + WebP at 480/960/1600/2400 px wide (never upscaled; tiny images get one width);
 *  - a ~24 px WebP data URI as the blur placeholder.
 */
export async function processImage(input: Buffer, type: RasterType): Promise<ProcessedImage> {
  const now = new Date();
  const dir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${newId()}`;
  const absDir = path.join(/*turbopackIgnore: true*/ uploadRoot(), ...dir.split("/"));
  await mkdir(absDir, { recursive: true });

  const oriented = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" }).rotate();
  const encoder = {
    "image/jpeg": () => oriented.jpeg({ quality: 92, mozjpeg: true }),
    "image/png": () => oriented.png({ compressionLevel: 9 }),
    "image/webp": () => oriented.webp({ quality: 92 }),
    "image/avif": () => oriented.avif({ quality: 70 }),
  }[type];
  const { data: original, info } = await encoder().toBuffer({ resolveWithObject: true });
  const originalName = `original.${ORIGINAL_EXT[type]}`;
  await writeFile(path.join(absDir, originalName), original);

  const fitting = RESPONSIVE_WIDTHS.filter((w) => w <= info.width);
  const widths = fitting.length > 0 ? [...fitting] : [info.width];

  await Promise.all(
    widths.flatMap((width) => {
      const resized = () => sharp(original).resize({ width, withoutEnlargement: true });
      return [
        resized()
          .avif({ quality: 52, effort: 4 })
          .toFile(path.join(absDir, `w${width}.avif`)),
        resized()
          .webp({ quality: 80 })
          .toFile(path.join(absDir, `w${width}.webp`)),
      ];
    }),
  );

  const tiny = await sharp(original).resize({ width: 24 }).webp({ quality: 40 }).toBuffer();

  return {
    dir,
    original: originalName,
    mime: type,
    width: info.width,
    height: info.height,
    bytes: original.length,
    lqip: `data:image/webp;base64,${tiny.toString("base64")}`,
    widths,
  };
}

/** Raster brand logo (PNG): metadata stripped, at most 1200 px wide. */
export async function processLogoPng(input: Buffer): Promise<string> {
  const relative = `logos/${newId()}.png`;
  await mkdir(path.join(/*turbopackIgnore: true*/ uploadRoot(), "logos"), { recursive: true });
  await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .resize({ width: 1200, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(path.join(/*turbopackIgnore: true*/ uploadRoot(), ...relative.split("/")));
  return relative;
}

/** Stores an already sanitised SVG logo. */
export async function storeLogoSvg(svg: string): Promise<string> {
  const relative = `logos/${newId()}.svg`;
  await mkdir(path.join(/*turbopackIgnore: true*/ uploadRoot(), "logos"), { recursive: true });
  await writeFile(
    path.join(/*turbopackIgnore: true*/ uploadRoot(), ...relative.split("/")),
    svg,
    "utf8",
  );
  return relative;
}
