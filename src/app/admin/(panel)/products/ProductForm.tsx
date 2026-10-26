"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ImageManager, type ManagedImage } from "@/components/admin/ImageManager";
import { ReviewEditor } from "@/components/admin/ReviewEditor";
import { SubmitButton } from "@/components/admin/SubmitButton";
import {
  buttonClass,
  errorProps,
  Field,
  FormMessage,
  inputClass,
  Panel,
} from "@/components/admin/ui";
import { CURRENCIES } from "@/lib/admin/constants";
import type { ActionState } from "@/lib/admin/schemas";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/slug";
import { deleteProductAction, saveProductAction } from "./actions";

export type ProductFormValues = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  reviewEn: string;
  reviewAr: string;
  rating: string;
  price: string;
  currency: string;
  stock: string;
  brandId: string;
  isPublished: boolean;
  images: ManagedImage[];
};

const RATINGS = Array.from({ length: 11 }, (_, i) => (i / 2).toFixed(1));

const LANGUAGES = [
  { key: "En", code: "en", dir: "ltr", title: "English", placeholderName: "Satin lipstick" },
  { key: "Ar", code: "ar", dir: "rtl", title: "العربية", placeholderName: "أحمر شفاه ساتان" },
] as const;

export function ProductForm({
  product,
  brands,
}: {
  product?: ProductFormValues;
  brands: Array<{ id: string; name: string }>;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveProductAction, {});
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(
    deleteProductAction,
    {},
  );
  const [tab, setTab] = useState<"En" | "Ar">("En");
  const [nameEn, setNameEn] = useState(product?.nameEn ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const effectiveSlug = slugTouched ? slug : slugify(nameEn);
  const e = state.errors ?? {};
  // After a failed save React resets uncontrolled fields to these defaults (see ActionState).
  const v = (key: keyof ProductFormValues) =>
    state.values?.[key] ?? (product?.[key] as string | undefined);

  return (
    <div className="flex flex-col gap-8">
      <form action={action} className="flex flex-col gap-8" noValidate>
        {product ? <input type="hidden" name="id" value={product.id} /> : null}
        <FormMessage state={state} />

        {/* Language tabs on small screens; both columns side by side from md up. */}
        <div
          className="flex gap-6 border-b border-sand-200 md:hidden"
          role="tablist"
          aria-label="Language"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.key}
              type="button"
              role="tab"
              aria-selected={tab === lang.key}
              onClick={() => setTab(lang.key)}
              className={cn(
                "label -mb-px border-b pb-3",
                tab === lang.key ? "border-mocha text-mocha" : "border-transparent text-sand-700",
              )}
            >
              {lang.title}
            </button>
          ))}
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {LANGUAGES.map((lang) => {
            const field = (base: string) => `${base}${lang.key}`;
            return (
              <div key={lang.key} className={cn(tab !== lang.key && "hidden md:block")}>
                <Panel title={lang.title}>
                  <div className="flex flex-col gap-6" dir={lang.dir} lang={lang.code}>
                    <Field
                      label={lang.key === "En" ? "Name" : "الاسم"}
                      htmlFor={field("name")}
                      errors={e[field("name")]}
                    >
                      <input
                        id={field("name")}
                        name={field("name")}
                        defaultValue={lang.key === "Ar" ? v("nameAr") : undefined}
                        value={lang.key === "En" ? nameEn : undefined}
                        onChange={
                          lang.key === "En" ? (ev) => setNameEn(ev.target.value) : undefined
                        }
                        placeholder={lang.placeholderName}
                        className={inputClass}
                        {...errorProps(field("name"), e[field("name")])}
                      />
                    </Field>
                    <Field
                      label={lang.key === "En" ? "Description" : "الوصف"}
                      htmlFor={field("description")}
                      errors={e[field("description")]}
                    >
                      <textarea
                        id={field("description")}
                        name={field("description")}
                        rows={4}
                        defaultValue={lang.key === "En" ? v("descriptionEn") : v("descriptionAr")}
                        className={inputClass}
                        {...errorProps(field("description"), e[field("description")])}
                      />
                    </Field>
                    <Field
                      label={lang.key === "En" ? "Zina's review" : "مراجعة زينة"}
                      htmlFor={field("review")}
                      hint={
                        lang.key === "En"
                          ? "Paragraphs, **bold** and lists."
                          : "فقرات، **عريض**، وقوائم."
                      }
                      errors={e[field("review")]}
                    >
                      <ReviewEditor
                        id={field("review")}
                        name={field("review")}
                        dir={lang.dir}
                        lang={lang.code}
                        defaultValue={lang.key === "En" ? product?.reviewEn : product?.reviewAr}
                        invalid={Boolean(e[field("review")]?.length)}
                      />
                    </Field>
                  </div>
                </Panel>
              </div>
            );
          })}
        </div>

        <Panel title="Details">
          <div className="grid gap-6 md:grid-cols-3">
            <Field label="Brand" htmlFor="brandId" errors={e.brandId}>
              <select
                id="brandId"
                name="brandId"
                defaultValue={v("brandId") ?? ""}
                className={inputClass}
                {...errorProps("brandId", e.brandId)}
              >
                <option value="" disabled>
                  Choose a brand
                </option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Zina's rating"
              htmlFor="rating"
              hint="Out of 5, in half steps."
              errors={e.rating}
            >
              <select
                id="rating"
                name="rating"
                defaultValue={v("rating") ?? ""}
                className={inputClass}
                {...errorProps("rating", e.rating)}
              >
                <option value="">Not rated</option>
                {RATINGS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Stock"
              htmlFor="stock"
              hint="Leave empty if not tracked."
              errors={e.stock}
            >
              <input
                id="stock"
                name="stock"
                inputMode="numeric"
                defaultValue={v("stock") ?? ""}
                className={inputClass}
                {...errorProps("stock", e.stock)}
              />
            </Field>
            <Field label="Price" htmlFor="price" errors={e.price}>
              <input
                id="price"
                name="price"
                inputMode="decimal"
                placeholder="38.00"
                defaultValue={v("price") ?? ""}
                className={inputClass}
                {...errorProps("price", e.price)}
              />
            </Field>
            <Field label="Currency" htmlFor="currency" errors={e.currency}>
              <select
                id="currency"
                name="currency"
                defaultValue={v("currency") ?? "USD"}
                className={inputClass}
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </select>
            </Field>
            <Field
              label="Slug"
              htmlFor="slug"
              hint="From the English name until you edit it."
              errors={e.slug}
            >
              <input
                id="slug"
                name="slug"
                value={effectiveSlug}
                onChange={(ev) => {
                  setSlugTouched(true);
                  setSlug(ev.target.value);
                }}
                className={inputClass}
                {...errorProps("slug", e.slug)}
              />
            </Field>
          </div>

          <label className="mt-8 flex cursor-pointer items-center gap-4 border-t border-sand-200 pt-6">
            <input
              type="checkbox"
              name="isPublished"
              defaultChecked={
                state.values ? state.values.isPublished === "on" : (product?.isPublished ?? false)
              }
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="relative h-6 w-11 shrink-0 rounded-full border border-sand bg-white transition-colors peer-checked:border-mocha peer-checked:bg-mocha peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-mocha after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-sand after:transition-transform peer-checked:after:translate-x-5 peer-checked:after:bg-white"
            />
            <span className="flex flex-col">
              <span className="text-sm text-mocha">Published on the site</span>
              <span className="text-xs text-sand-700">Drafts stay hidden from visitors.</span>
            </span>
          </label>
        </Panel>

        <Panel
          title="Images"
          aside={<span className="text-xs text-sand-700">The first image is the cover</span>}
        >
          <ImageManager initial={product?.images ?? []} error={e.images} />
        </Panel>

        <div className="flex flex-wrap items-center gap-4">
          <SubmitButton>{product ? "Save product" : "Create product"}</SubmitButton>
          {product ? (
            <Link
              href={`/en/products/${product.slug}`}
              target="_blank"
              className={buttonClass.secondary}
            >
              Preview on site
            </Link>
          ) : null}
        </div>
      </form>

      {product ? (
        <form action={deleteAction} className="border-t border-sand-200 pt-8">
          <input type="hidden" name="id" value={product.id} />
          <FormMessage state={deleteState} />
          <details className="mt-4">
            <summary className={buttonClass.quiet}>Delete this product</summary>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <p className="text-sm text-sand-700">
                This removes it and its images from the catalogue. It cannot be undone.
              </p>
              <SubmitButton variant="secondary" pendingLabel="Deleting…">
                Delete product
              </SubmitButton>
            </div>
          </details>
        </form>
      ) : null}
    </div>
  );
}
