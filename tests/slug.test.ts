import { describe, expect, it } from "vitest";
import { isValidSlug, slugify, uniqueSlug } from "@/lib/slug";

describe("slug", () => {
  it("folds accents and punctuation into hyphenated lowercase", () => {
    expect(slugify("Lancôme Absolue Crème")).toBe("lancome-absolue-creme");
    expect(slugify("  Estée Lauder — Double Wear!  ")).toBe("estee-lauder-double-wear");
    expect(slugify("Rose & Oud")).toBe("rose-and-oud");
  });

  it("returns an empty string when nothing usable remains", () => {
    expect(slugify("زينة")).toBe("");
    expect(slugify("---")).toBe("");
  });

  it("caps the length without a trailing hyphen", () => {
    const slug = slugify("a ".repeat(100));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("validates slugs", () => {
    expect(isValidSlug("satin-lipstick-2")).toBe(true);
    expect(isValidSlug("Satin")).toBe(false);
    expect(isValidSlug("a--b")).toBe(false);
    expect(isValidSlug("../etc")).toBe(false);
  });

  it("adds numeric suffixes until the slug is free", async () => {
    const taken = new Set(["satin-lipstick", "satin-lipstick-2"]);
    await expect(uniqueSlug("Satin Lipstick", async (s) => taken.has(s))).resolves.toBe(
      "satin-lipstick-3",
    );
    await expect(uniqueSlug("زينة", async () => false, "product")).resolves.toBe("product");
  });
});
