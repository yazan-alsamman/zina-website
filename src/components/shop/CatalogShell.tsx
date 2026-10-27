"use client";

import { useTranslations } from "next-intl";
import {
  type ReactNode,
  type SubmitEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { CATALOG_SORTS, type CatalogQuery, RATING_STEPS } from "@/lib/shop/catalog-query";

type Brand = { slug: string; name: string };

/**
 * Filters + results. The filters are a plain GET form (works without JavaScript); with JS every
 * change replaces the URL in a transition, so the server re-renders the grid while the current
 * one stays on screen, dimmed.
 */
export function CatalogShell({
  query,
  brands,
  currency,
  children,
}: {
  query: CatalogQuery;
  brands: Brand[];
  currency: string;
  children: ReactNode;
}) {
  const t = useTranslations("Catalog");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const filterCount =
    query.brands.length +
    (query.minRating !== null ? 1 : 0) +
    (query.minPrice !== null || query.maxPrice !== null ? 1 : 0) +
    (query.q ? 1 : 0);
  // Starts open when the link already carries filters (search alone stays in the top row).
  const [open, setOpen] = useState(filterCount - (query.q ? 1 : 0) > 0);
  const formRef = useRef<HTMLFormElement>(null);
  const searchTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(searchTimer.current), []);

  const apply = () => {
    const form = formRef.current;
    if (!form) return;
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (
        typeof value === "string" &&
        value.trim() !== "" &&
        !(key === "sort" && value === "newest")
      ) {
        params.append(key, value.trim());
      }
    }
    const search = params.toString();
    startTransition(() => {
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    });
  };

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.clearTimeout(searchTimer.current);
    apply();
  };

  return (
    <div>
      <form
        ref={formRef}
        method="get"
        role="search"
        aria-label={t("filtersLabel")}
        onSubmit={onSubmit}
        onChange={(event) => {
          const target = event.target;
          // Text fields apply on a pause or on Enter; everything else applies at once.
          if (
            target instanceof HTMLInputElement &&
            (target.type === "search" || target.type === "number")
          ) {
            window.clearTimeout(searchTimer.current);
            searchTimer.current = window.setTimeout(apply, 450);
          } else {
            apply();
          }
        }}
        className="border-y border-sand-200"
      >
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 py-5">
          <label className="relative flex min-w-0 flex-1 basis-56 items-center">
            <span className="sr-only">{t("search")}</span>
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="pointer-events-none absolute start-0 size-4 text-sand-700"
            >
              <circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <path d="M13 13l5 5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <input
              type="search"
              name="q"
              defaultValue={query.q}
              placeholder={t("searchPlaceholder")}
              className="w-full border-0 bg-transparent py-2 ps-7 text-mocha placeholder:text-sand-700 focus:outline-none focus-visible:outline-none"
            />
          </label>

          <label className="flex items-center gap-3">
            <span className="label text-sand-700">{t("sort")}</span>
            <select
              name="sort"
              defaultValue={query.sort}
              className="cursor-pointer border-0 border-b border-transparent bg-transparent py-1 text-mocha hover:border-sand"
            >
              {CATALOG_SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {t(`sorts.${sort}`)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            aria-expanded={open}
            aria-controls="catalog-refine"
            onClick={() => setOpen((value) => !value)}
            className="label flex items-center gap-2 border-b border-transparent pb-1 text-mocha hover:border-mocha"
          >
            {t("refine")}
            {filterCount > 0 ? (
              <span className="grid size-5 place-items-center rounded-full bg-mocha text-[0.65rem] tracking-normal text-white">
                {filterCount}
              </span>
            ) : null}
            <svg
              aria-hidden
              viewBox="0 0 12 12"
              className={cn("size-2.5 transition-transform duration-500", open && "rotate-180")}
            >
              <path d="M1 4l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        <div
          id="catalog-refine"
          // Hidden with CSS only, so the fields stay in the form (and in the URL) when closed.
          className={cn(
            "grid transition-[grid-template-rows] duration-700 ease-luxe",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden" inert={!open}>
            <div className="grid gap-10 border-t border-sand-200 py-8 md:grid-cols-[2fr_1fr_1fr]">
              <fieldset>
                <legend className="label text-sand-700">{t("brand")}</legend>
                <div className="mt-4 flex flex-wrap gap-2">
                  {brands.map((brand) => (
                    <label key={brand.slug} className="cursor-pointer">
                      <input
                        type="checkbox"
                        name="brand"
                        value={brand.slug}
                        defaultChecked={query.brands.includes(brand.slug)}
                        className="peer sr-only"
                      />
                      <span
                        lang="en"
                        className="block rounded-full border border-sand-200 px-4 py-2 text-sm text-mocha transition-colors duration-300 peer-checked:border-mocha peer-checked:bg-mocha peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 hover:border-mocha"
                      >
                        {brand.name}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="label text-sand-700">{t("rating")}</legend>
                <div className="mt-4 flex flex-col gap-2.5">
                  {[null, ...RATING_STEPS].map((step) => (
                    <label
                      key={step ?? "any"}
                      className="flex cursor-pointer items-center gap-3 text-sm"
                    >
                      <input
                        type="radio"
                        name="rating"
                        value={step ?? ""}
                        defaultChecked={query.minRating === step}
                        className="size-3.5 accent-mocha"
                      />
                      {step === null
                        ? t("anyRating")
                        : t("ratingAtLeast", { rating: step.toFixed(1) })}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="label text-sand-700">{t("price", { currency })}</legend>
                <div className="mt-4 flex items-end gap-3">
                  <label className="flex flex-1 flex-col gap-1.5 text-xs text-sand-700">
                    {t("min")}
                    <input
                      type="number"
                      name="min"
                      min={0}
                      inputMode="decimal"
                      defaultValue={query.minPrice ?? ""}
                      className="w-full border-0 border-b border-sand-200 bg-transparent py-1.5 text-base text-mocha focus:border-mocha focus:outline-none"
                    />
                  </label>
                  <span aria-hidden className="pb-2 text-sand-700">
                    –
                  </span>
                  <label className="flex flex-1 flex-col gap-1.5 text-xs text-sand-700">
                    {t("max")}
                    <input
                      type="number"
                      name="max"
                      min={0}
                      inputMode="decimal"
                      defaultValue={query.maxPrice ?? ""}
                      className="w-full border-0 border-b border-sand-200 bg-transparent py-1.5 text-base text-mocha focus:border-mocha focus:outline-none"
                    />
                  </label>
                </div>
                <div className="mt-6 flex items-center gap-6">
                  <button type="submit" className="label border-b border-mocha pb-1 text-mocha">
                    {t("apply")}
                  </button>
                  {filterCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        // reset() would restore the current filters (they are the defaults).
                        for (const field of formRef.current?.elements ?? []) {
                          if (!(field instanceof HTMLInputElement)) continue;
                          if (field.type === "checkbox") field.checked = false;
                          else if (field.type === "radio") field.checked = field.value === "";
                          else field.value = "";
                        }
                        startTransition(() => {
                          const sort = query.sort === "newest" ? "" : `?sort=${query.sort}`;
                          router.replace(`${pathname}${sort}`, { scroll: false });
                        });
                      }}
                      className="label border-b border-transparent pb-1 text-sand-700 hover:border-sand-700"
                    >
                      {t("clear")}
                    </button>
                  ) : null}
                </div>
              </fieldset>
            </div>
          </div>
        </div>
      </form>

      <div
        aria-busy={pending}
        className={cn(
          "transition-opacity duration-500 ease-luxe",
          pending && "pointer-events-none opacity-45",
        )}
      >
        {children}
      </div>
    </div>
  );
}
