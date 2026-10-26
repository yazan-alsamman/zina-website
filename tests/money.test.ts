import { describe, expect, it } from "vitest";
import { computeSubtotal, computeTotal, fromCents, parseAmount, toCents } from "@/lib/money";

describe("money", () => {
  it("converts between decimal strings and cents without float drift", () => {
    expect(toCents("0.1")).toBe(10);
    expect(toCents("19.99")).toBe(1999);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(fromCents(1999)).toBe("19.99");
    expect(fromCents(5)).toBe("0.05");
    expect(fromCents(-250)).toBe("-2.50");
  });

  it("rejects malformed amounts", () => {
    expect(() => toCents("12.345")).toThrow();
    expect(() => toCents("abc")).toThrow();
    expect(parseAmount("12,5")).toBe(1250);
    expect(parseAmount("-3")).toBeNull();
    expect(parseAmount("1e3")).toBeNull();
  });

  it("computes the subtotal from snapshot prices", () => {
    expect(
      computeSubtotal([
        { unitPrice: "38.00", quantity: 2 },
        { unitPrice: "145.50", quantity: 1 },
      ]),
    ).toBe(22150);
    expect(() => computeSubtotal([{ unitPrice: "10", quantity: 0 }])).toThrow();
  });

  it("total = subtotal + shipping fee, and requires the fee", () => {
    expect(computeTotal("221.50", "18.25")).toBe(23975);
    expect(computeTotal("10.00", "0")).toBe(1000);
    expect(() => computeTotal("10.00", null)).toThrow(/Shipping fee is required/);
    expect(() => computeTotal("10.00", "-1.00")).toThrow();
  });
});
