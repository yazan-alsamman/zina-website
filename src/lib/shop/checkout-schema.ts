import {
  type CountryCode as PhoneCountry,
  isSupportedCountry,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
import { z } from "zod";
import { PAYMENT_METHODS } from "../orders/workflow";
import { isCountryCode } from "./countries";
import { MAX_LINES, MAX_QUANTITY } from "./pricing";

/**
 * Checkout validation, shared by the form (client) and the server action. Messages are
 * translation keys under `Checkout.errors`, so both locales get their own wording.
 */
export type CheckoutErrorKey =
  "required" | "tooLong" | "email" | "phone" | "country" | "payment" | "empty" | "invalid";

const required = (max: number) => z.string().trim().min(1, "required").max(max, "tooLong");

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .transform((value) => (value === "" ? null : value));

/** Parses a phone number (international, or national for `country`) to "+49 30 1234567". */
export function normalizePhone(raw: string, country: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const fallback = isSupportedCountry(country) ? (country as PhoneCountry) : undefined;
  const parsed = parsePhoneNumberFromString(text, fallback);
  return parsed?.isValid() ? parsed.formatInternational() : null;
}

export const checkoutSchema = z
  .object({
    name: required(120).pipe(z.string().min(2, "required")),
    email: z.string().trim().toLowerCase().max(254, "tooLong").pipe(z.email("email")),
    phoneCountry: z.string().refine(isCountryCode, "country"),
    phone: required(40),
    whatsapp: optional(40),
    country: z.string().refine(isCountryCode, "country"),
    city: required(100),
    addressLine1: required(200),
    addressLine2: optional(200),
    postalCode: optional(20),
    notes: optional(1000),
    paymentMethod: z.enum(PAYMENT_METHODS, "payment"),
    idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/, "invalid"),
    // Only ids and quantities: anything else the client sends (a price, say) is stripped here.
    lines: z
      .array(
        z.object({
          productId: z.string().min(1).max(40),
          quantity: z.number().int().min(1).max(MAX_QUANTITY),
        }),
        "empty",
      )
      .min(1, "empty")
      .max(MAX_LINES, "invalid"),
  })
  .transform((data, ctx) => {
    const phone = normalizePhone(data.phone, data.phoneCountry);
    if (!phone) ctx.addIssue({ code: "custom", path: ["phone"], message: "phone" });
    const whatsapp = data.whatsapp ? normalizePhone(data.whatsapp, data.phoneCountry) : null;
    if (data.whatsapp && !whatsapp) {
      ctx.addIssue({ code: "custom", path: ["whatsapp"], message: "phone" });
    }
    return { ...data, phone: phone ?? "", whatsapp };
  });

export type CheckoutInput = z.output<typeof checkoutSchema>;
