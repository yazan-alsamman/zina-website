/**
 * Human order numbers: "ZAM-<year>-<nnnnnn>", e.g. ZAM-2026-000123. The running number comes
 * from the PostgreSQL sequence `order_number_seq` (see the storefront_checkout migration), so
 * concurrent checkouts can never share a number.
 */
export const ORDER_NUMBER_PREFIX = "ZAM";

const ORDER_NUMBER_PATTERN = /^[A-Z]{2,4}-\d{4}-\d{5,9}$/;

export function formatOrderNumber(year: number, sequence: number | bigint): string {
  const n = Number(sequence);
  if (!Number.isInteger(year) || year < 2000 || year > 9999) throw new RangeError("Bad year");
  if (!Number.isSafeInteger(n) || n < 1) throw new RangeError("Sequence must be positive");
  return `${ORDER_NUMBER_PREFIX}-${year}-${String(n).padStart(6, "0")}`;
}

/** Cheap shape check before touching the database (tracking URLs are public). */
export function isOrderNumber(value: string): boolean {
  return ORDER_NUMBER_PATTERN.test(value);
}
