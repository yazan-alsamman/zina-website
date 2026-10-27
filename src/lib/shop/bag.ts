import { type BagLine, MAX_QUANTITY, normalizeLines } from "./pricing";

/**
 * Brings a stored bag in line with what is currently on sale: lines whose product is no longer
 * published (or no longer exists) are dropped and reported, quantities are capped by stock.
 */
export function reconcileBag(
  lines: readonly BagLine[],
  available: ReadonlyArray<{ id: string; stock: number | null }>,
) {
  const byId = new Map(available.map((product) => [product.id, product]));
  const kept: BagLine[] = [];
  const removed: string[] = [];

  for (const line of normalizeLines(lines)) {
    const product = byId.get(line.productId);
    if (!product || product.stock === 0) {
      removed.push(line.productId);
      continue;
    }
    const cap = Math.min(MAX_QUANTITY, product.stock ?? MAX_QUANTITY);
    kept.push({ productId: line.productId, quantity: Math.min(line.quantity, cap) });
  }

  return { lines: kept, removed };
}
