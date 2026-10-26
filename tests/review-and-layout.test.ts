import { describe, expect, it } from "vitest";
import { layoutConstellation, rectGap } from "@/components/three/landing/constellation-layout";
import { brands } from "@/config/brands";
import { renderReview } from "@/lib/review-markup";

describe("review markup", () => {
  it("renders the supported subset", () => {
    expect(renderReview("A **lovely** balm.\n\n- glides\n- lasts")).toBe(
      "<p>A <strong>lovely</strong> balm.</p><ul><li>glides</li><li>lasts</li></ul>",
    );
    expect(renderReview("1. cleanse\n2. apply")).toBe("<ol><li>cleanse</li><li>apply</li></ol>");
  });

  it("escapes markup so reviews cannot inject HTML", () => {
    const html = renderReview('<img src=x onerror="alert(1)"> **<script>x</script>**');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});

describe("constellation layout", () => {
  const names = brands.map((brand) => brand.name);
  const run = (aspect: number, height: number) =>
    layoutConstellation({
      names,
      aspect,
      viewportHeightPx: height,
      fovDeg: 35,
      focus: 6.5,
      startZ: 6,
      travel: 52,
      sway: () => 0,
    });

  for (const [label, aspect, height] of [
    ["desktop", 1440 / 900, 900],
    ["mobile", 390 / 844, 844],
  ] as const) {
    it(`keeps every in-focus name inside the safe frame and above the copy (${label})`, () => {
      for (const item of run(aspect, height)) {
        const { u, v, hw, hh } = item.ndc;
        expect(Math.abs(u) + hw).toBeLessThanOrEqual(0.95);
        expect(v + hh).toBeLessThanOrEqual(0.95);
        expect(v - hh).toBeGreaterThanOrEqual(0.1); // never in the lower half where the copy lives
        expect(item.fadeOutStart).toBeGreaterThanOrEqual(6.5 - 0.05); // still sharp at focus
      }
    });

    it(`does not overlap consecutive names at the moment one is in focus (${label})`, () => {
      const items = run(aspect, height);
      for (let i = 1; i < items.length; i++) {
        const spacing = items[i - 1].position[2] - items[i].position[2];
        const previousDistance = 6.5 - spacing;
        if (previousDistance <= items[i - 1].fadeOut) continue; // already faded out
        const s = 6.5 / previousDistance;
        const prev = items[i - 1].ndc;
        const scaled = { u: prev.u * s, v: prev.v * s, hw: prev.hw * s, hh: prev.hh * s };
        expect(rectGap(items[i].ndc, scaled)).toBeGreaterThan(0);
      }
    });
  }
});
