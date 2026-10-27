import { describe, expect, it } from "vitest";
import {
  planRelease,
  planReservation,
  releaseNote,
  reservationNote,
  shortageMessage,
  type StockLine,
} from "@/lib/orders/stock";

const line = (overrides: Partial<StockLine>): StockLine => ({
  id: "item-1",
  productId: "p1",
  name: "Renewal Cream",
  quantity: 2,
  reservedQuantity: 0,
  ...overrides,
});

describe("stock reservation on approval", () => {
  it("reserves tracked products and skips unlimited ones", () => {
    const { reservations, shortages } = planReservation(
      [line({}), line({ id: "item-2", productId: "p2", name: "Eau de Parfum", quantity: 1 })],
      new Map<string, number | null>([
        ["p1", 6],
        ["p2", null],
      ]),
    );
    expect(shortages).toEqual([]);
    expect(reservations).toEqual([
      {
        itemId: "item-1",
        productId: "p1",
        name: "Renewal Cream",
        quantity: 2,
        before: 6,
        after: 4,
      },
    ]);
    expect(reservationNote(reservations)).toBe("Stock reserved: Renewal Cream ×2 (6 → 4).");
  });

  it("refuses with a clear message when stock is insufficient", () => {
    const { reservations, shortages } = planReservation(
      [line({ quantity: 3 })],
      new Map([["p1", 1]]),
    );
    expect(reservations).toEqual([]);
    expect(shortageMessage(shortages)).toBe(
      "Not enough stock to approve: Renewal Cream (needs 3, 1 in stock). Update the stock or contact the customer first.",
    );
  });

  it("counts several lines of the same product against one shelf", () => {
    const { shortages } = planReservation(
      [line({}), line({ id: "item-2", quantity: 2 })],
      new Map([["p1", 3]]),
    );
    expect(shortages).toEqual([{ name: "Renewal Cream", needed: 2, available: 1 }]);
  });

  it("never reserves the same units twice", () => {
    const { reservations } = planReservation([line({ reservedQuantity: 2 })], new Map([["p1", 6]]));
    expect(reservations).toEqual([]);
  });
});

describe("stock release on cancellation", () => {
  it("gives back exactly what was reserved, and nothing for unreserved lines", () => {
    const released = planRelease([
      line({ reservedQuantity: 2 }),
      line({ id: "item-2", productId: "p2", reservedQuantity: 0 }),
    ]);
    expect(released).toEqual([
      { itemId: "item-1", productId: "p1", name: "Renewal Cream", quantity: 2 },
    ]);
    expect(
      releaseNote([
        { name: "Renewal Cream", quantity: 2, after: 6 },
        { name: "Velvet Blush", quantity: 1, after: null },
      ]),
    ).toBe(
      "Stock restored: Renewal Cream +2 (now 6), Velvet Blush ×1 (now unlimited, nothing to add back).",
    );
  });
});
