import { formatCurrency } from "../money";

/**
 * Storefront prices, formatted for the visitor's locale (Latin digits in both languages, as the
 * site's numerals are set in Cormorant). Whole amounts drop the ".00": "$48", "$47.50".
 */
export function displayPrice(cents: number, currency: string, locale: string): string {
  return formatCurrency(cents / 100, currency, locale, cents % 100 === 0 ? 0 : 2);
}

/** One decimal, locale-aware: "4.5" / "4.5" (Latin digits). */
export function displayRating(rating: number, locale: string): string {
  return new Intl.NumberFormat(`${locale}-u-nu-latn`, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);
}
