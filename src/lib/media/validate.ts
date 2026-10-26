export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export type RasterType = "image/jpeg" | "image/png" | "image/webp" | "image/avif";

/**
 * Detects the real image type from magic bytes. The client-supplied MIME type and file name
 * are never trusted.
 */
export function detectImageType(bytes: Uint8Array): RasterType | null {
  const at = (offset: number, ...values: number[]) =>
    values.every((value, i) => bytes[offset + i] === value);
  const ascii = (offset: number, text: string) =>
    [...text].every((char, i) => bytes[offset + i] === char.charCodeAt(0));

  if (bytes.length < 12) return null;
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  // ISO-BMFF: [size]["ftyp"][major brand] — AVIF still images use "avif", sequences "avis".
  if (ascii(4, "ftyp")) {
    const brands: string[] = [];
    const boxSize = Math.min((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3], 64);
    for (let offset = 8; offset + 4 <= Math.min(boxSize, bytes.length); offset += 4) {
      if (offset === 12) continue; // minor version, not a brand
      brands.push(String.fromCharCode(...bytes.slice(offset, offset + 4)));
    }
    if (brands.includes("avif") || brands.includes("avis")) return "image/avif";
  }
  return null;
}

/** Plain-text sniff for SVG logos (they are sanitised separately before storage). */
export function looksLikeSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.slice(0, 2048))
    .replace(/^﻿/, "")
    .trimStart()
    .toLowerCase();
  return (
    (head.startsWith("<?xml") || head.startsWith("<svg") || head.startsWith("<!--")) &&
    head.includes("<svg")
  );
}

export type UploadCheck = { ok: true; type: RasterType } | { ok: false; error: string };

export function validateImageUpload(bytes: Uint8Array, size = bytes.length): UploadCheck {
  if (size === 0) return { ok: false, error: "The file is empty." };
  if (size > MAX_UPLOAD_BYTES) return { ok: false, error: "Images must be 15 MB or smaller." };
  const type = detectImageType(bytes);
  if (!type) return { ok: false, error: "Only JPEG, PNG, WebP or AVIF images are accepted." };
  return { ok: true, type };
}
