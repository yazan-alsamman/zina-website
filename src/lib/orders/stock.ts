/**
 * Stock is reserved when an order is approved (not when it is placed: unreviewed orders never
 * block the shelf) and given back if an approved order is cancelled. Products with
 * `stock = null` are unlimited and never reserved.
 */

export type StockLine = {
  /** OrderItem id */
  id: string;
  productId: string;
  name: string;
  quantity: number;
  reservedQuantity: number;
};

export type Reservation = {
  itemId: string;
  productId: string;
  name: string;
  quantity: number;
  before: number;
  after: number;
};

export type Shortage = { name: string; needed: number; available: number };

/** What approving takes from each product, or what is missing. */
export function planReservation(
  lines: readonly StockLine[],
  stockByProduct: ReadonlyMap<string, number | null>,
): { reservations: Reservation[]; shortages: Shortage[] } {
  const remaining = new Map(stockByProduct);
  const reservations: Reservation[] = [];
  const shortages: Shortage[] = [];

  for (const line of lines) {
    // Already reserved (should not happen on a fresh approval): never take twice.
    const needed = line.quantity - line.reservedQuantity;
    if (needed <= 0) continue;
    const stock = remaining.get(line.productId);
    if (stock === null || stock === undefined) continue; // unlimited (or product gone)
    if (stock < needed) {
      shortages.push({ name: line.name, needed, available: stock });
      continue;
    }
    remaining.set(line.productId, stock - needed);
    reservations.push({
      itemId: line.id,
      productId: line.productId,
      name: line.name,
      quantity: needed,
      before: stock,
      after: stock - needed,
    });
  }

  return { reservations, shortages };
}

/** Lines whose reserved units go back on the shelf when the order is cancelled. */
export function planRelease(lines: readonly StockLine[]) {
  return lines
    .filter((line) => line.reservedQuantity > 0)
    .map((line) => ({
      itemId: line.id,
      productId: line.productId,
      name: line.name,
      quantity: line.reservedQuantity,
    }));
}

export function shortageMessage(shortages: readonly Shortage[]): string {
  const list = shortages
    .map((s) => `${s.name} (needs ${s.needed}, ${s.available} in stock)`)
    .join(", ");
  return `Not enough stock to approve: ${list}. Update the stock or contact the customer first.`;
}

export function reservationNote(reservations: readonly Reservation[]): string {
  return `Stock reserved: ${reservations
    .map((r) => `${r.name} ×${r.quantity} (${r.before} → ${r.after})`)
    .join(", ")}.`;
}

export function releaseNote(
  released: ReadonlyArray<{ name: string; quantity: number; after: number | null }>,
): string {
  return `Stock restored: ${released
    .map((r) =>
      r.after === null
        ? `${r.name} ×${r.quantity} (now unlimited, nothing to add back)`
        : `${r.name} +${r.quantity} (now ${r.after})`,
    )
    .join(", ")}.`;
}
