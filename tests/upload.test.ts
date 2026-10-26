import { describe, expect, it } from "vitest";
import {
  detectImageType,
  looksLikeSvg,
  MAX_UPLOAD_BYTES,
  validateImageUpload,
} from "@/lib/media/validate";

const bytes = (...values: number[]) => {
  const out = new Uint8Array(32);
  out.set(values);
  return out;
};
const ascii = (text: string, offset: number, target: Uint8Array) => {
  [...text].forEach((char, i) => (target[offset + i] = char.charCodeAt(0)));
  return target;
};

describe("upload validation", () => {
  it("recognises formats by magic bytes", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(
      "image/png",
    );
    const webp = ascii("WEBP", 8, ascii("RIFF", 0, new Uint8Array(32)));
    expect(detectImageType(webp)).toBe("image/webp");
    const avif = ascii("avif", 8, ascii("ftyp", 4, bytes(0, 0, 0, 0x1c)));
    expect(detectImageType(avif)).toBe("image/avif");
  });

  it("rejects disguised files regardless of name or claimed MIME type", () => {
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    expect(validateImageUpload(html)).toEqual({
      ok: false,
      error: "Only JPEG, PNG, WebP or AVIF images are accepted.",
    });
    // GIF and HEIC-like containers are not on the allow-list.
    expect(detectImageType(ascii("GIF89a", 0, new Uint8Array(32)))).toBeNull();
    const heic = ascii("heic", 8, ascii("ftyp", 4, bytes(0, 0, 0, 0x18)));
    expect(detectImageType(heic)).toBeNull();
  });

  it("enforces the 15 MB limit and rejects empty files", () => {
    const jpeg = bytes(0xff, 0xd8, 0xff, 0xe0);
    expect(validateImageUpload(jpeg, MAX_UPLOAD_BYTES + 1)).toMatchObject({ ok: false });
    expect(validateImageUpload(jpeg, MAX_UPLOAD_BYTES)).toEqual({ ok: true, type: "image/jpeg" });
    expect(validateImageUpload(new Uint8Array(0))).toMatchObject({ ok: false });
  });

  it("sniffs SVG text for logos", () => {
    expect(
      looksLikeSvg(
        new TextEncoder().encode('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>'),
      ),
    ).toBe(true);
    expect(looksLikeSvg(new TextEncoder().encode("<html><body/></html>"))).toBe(false);
  });
});
