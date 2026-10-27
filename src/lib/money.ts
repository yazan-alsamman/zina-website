/**
 * Money is handled as integer minor units (cents) to avoid floating-point drift; the database
 * stores DECIMAL(10,2). Inputs accept numbers, numeric strings and Prisma Decimal values.
 */
export type MoneyInput = number | string | { toString(): string };

const MONEY_PATTERN = /^-?\d+(?:\.\d{1,2})?$/;
const MAX_CENTS = 99_999_999_99; // DECIMAL(10,2)

export function toCents(value: MoneyInput): number {
  const text = typeof value === "number" ? value.toFixed(2) : value.toString().trim();
  if (!MONEY_PATTERN.test(text)) throw new RangeError(`Not a money amount: "${text}"`);
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace("-", "").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (cents > MAX_CENTS) throw new RangeError("Amount too large");
  return negative ? -cents : cents;
}

/** Cents back to a DECIMAL-compatible string, e.g. 12345 -> "123.45". */
export function fromCents(cents: number): string {
  if (!Number.isInteger(cents)) throw new RangeError("Cents must be an integer");
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Validates a non-negative amount entered by an admin (shipping fee, price). */
export function parseAmount(input: string): number | null {
  const text = input.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  try {
    return toCents(text);
  } catch {
    return null;
  }
}

/** Subtotal from order lines (unit price × quantity). */
export function computeSubtotal(lines: ReadonlyArray<{ unitPrice: MoneyInput; quantity: number }>) {
  return lines.reduce((sum, line) => {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new RangeError("Quantity must be a positive integer");
    }
    return sum + toCents(line.unitPrice) * line.quantity;
  }, 0);
}

/** Order total = subtotal + shipping fee. The fee must be known (and non-negative). */
export function computeTotal(subtotal: MoneyInput, shippingFee: MoneyInput | null | undefined) {
  if (shippingFee === null || shippingFee === undefined) {
    throw new Error("Shipping fee is required before a total can be computed");
  }
  const fee = toCents(shippingFee);
  if (fee < 0) throw new RangeError("Shipping fee cannot be negative");
  return toCents(subtotal) + fee;
}

export function formatMoney(value: MoneyInput, currency: string, locale = "en-US") {
  return formatCurrency(toCents(value) / 100, currency, locale, 2);
}

/**
 * Locale-aware currency formatting with Latin digits. Arabic keeps its own layout (amount, then
 * symbol) but uses the familiar narrow symbol: "420 $" rather than "420 US$".
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string,
  minimumFractionDigits: number,
) {
  const format = new Intl.NumberFormat(`${locale}-u-nu-latn`, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits: 2,
  });
  if (!locale.startsWith("ar")) return format.format(amount);
  const symbol =
    new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency;
  return format
    .formatToParts(amount)
    .map((part) => (part.type === "currency" ? symbol : part.value))
    .join("");
}
