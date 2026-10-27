import { z } from "zod";
import { CURRENCIES, MAX_PRODUCT_IMAGES, MIN_PASSWORD_LENGTH } from "./constants";
import { parseAmount } from "@/lib/money";
import { isValidSlug } from "@/lib/slug";

/** Result shape every admin server action returns to `useActionState`. */
export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  /**
   * Submitted values, echoed back on failure. React resets uncontrolled fields after a form
   * action, so inputs use these as defaultValue to keep what the owner typed.
   */
  values?: Record<string, string>;
};

const NEVER_ECHO = /password|current|next|confirm|^\$ACTION/i;

export function submittedValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !NEVER_ECHO.test(key)) values[key] = value;
  }
  return values;
}

export function fieldErrors(error: z.ZodError, formData?: FormData): ActionState {
  return {
    ok: false,
    message: "Please correct the highlighted fields.",
    errors: z.flattenError(error).fieldErrors,
    values: formData ? submittedValues(formData) : undefined,
  };
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .transform((value) => (value === "" ? null : value));

const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .refine(
    (value) => value === "" || isValidSlug(value),
    "Use lowercase letters, numbers and hyphens",
  );

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  password: z.string().min(1, "Enter your password").max(256),
});

export const passwordChangeSchema = z
  .object({
    current: z.string().min(1, "Enter your current password").max(256),
    next: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
      .max(256),
    confirm: z.string(),
  })
  .refine((data) => data.next === data.confirm, {
    path: ["confirm"],
    message: "The passwords do not match",
  })
  .refine((data) => data.next !== data.current, {
    path: ["next"],
    message: "Choose a password you have not used here",
  });

export const brandSchema = z.object({
  name: z.string().trim().min(1, "Enter the brand name").max(80),
  slug: slugField,
  website: z
    .string()
    .trim()
    .transform((value) => (value && !/^https?:\/\//i.test(value) ? `https://${value}` : value))
    .pipe(z.union([z.literal(""), z.url("Enter a valid web address")]))
    .transform((value) => (value === "" ? null : value)),
  logoPath: z
    .string()
    .trim()
    .refine((value) => value === "" || /^logos\/[a-z0-9]+\.(svg|png)$/.test(value), "Invalid logo")
    .transform((value) => (value === "" ? null : value)),
});

const moneyField = z
  .string()
  .trim()
  .refine((value) => parseAmount(value) !== null, "Enter an amount like 38 or 38.50");

export const productImageSchema = z.object({
  assetId: z.string().min(1).max(40),
  altEn: z.string().trim().min(1, "Describe each image in English").max(160),
  altAr: z.string().trim().min(1, "Describe each image in Arabic").max(160),
});

export const productSchema = z.object({
  nameEn: z.string().trim().min(1, "Enter the English name").max(120),
  nameAr: z.string().trim().min(1, "Enter the Arabic name").max(120),
  descriptionEn: optionalText(4000),
  descriptionAr: optionalText(4000),
  reviewEn: optionalText(8000),
  reviewAr: optionalText(8000),
  rating: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .pipe(z.number().min(0).max(5).multipleOf(0.5, "Use half steps").nullable()),
  price: moneyField,
  currency: z.enum(CURRENCIES),
  stock: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .pipe(z.number().int("Whole units only").min(0).max(1_000_000).nullable()),
  brandId: z.string().min(1, "Choose a brand"),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  featuredOrder: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .pipe(z.number().int("Whole numbers only").min(1, "Use 1 or more").max(99).nullable()),
  slug: slugField,
  images: z.array(productImageSchema).max(MAX_PRODUCT_IMAGES, `Up to ${MAX_PRODUCT_IMAGES} images`),
});

export const shippingFeeSchema = z.object({ shippingFee: moneyField });
export const shippedSchema = z.object({
  trackingNumber: optionalText(80),
  carrier: optionalText(60),
});
export const paymentUrlSchema = z.object({
  paymentUrl: z
    .string()
    .trim()
    .max(2000, "Keep the link under 2000 characters")
    .refine((value) => {
      if (value === "") return true;
      try {
        const url = new URL(value);
        return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
      } catch {
        return false;
      }
    }, "Paste a full https:// payment link")
    .transform((value) => (value === "" ? null : value)),
});

export const cancelSchema = z.object({
  reason: z.string().trim().min(3, "Tell the team why the order is cancelled").max(500),
});

export const manualPostSchema = z.object({
  assetId: z.string().min(1, "Upload an image").max(40),
  caption: optionalText(2200),
  permalink: z
    .string()
    .trim()
    .refine(
      (value) =>
        /^https:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?(\?.*)?$/.test(value),
      "Paste the post link, e.g. https://www.instagram.com/p/ABC123/",
    ),
  mediaType: z.enum(["IMAGE", "VIDEO", "CAROUSEL_ALBUM"]),
  postedOn: z
    .string()
    .trim()
    .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), "Enter a valid date"),
});
