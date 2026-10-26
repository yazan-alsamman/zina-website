"use client";

import { useActionState, useRef, useState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import {
  buttonClass,
  errorProps,
  Field,
  FormMessage,
  inputClass,
  Panel,
} from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/schemas";
import { slugify } from "@/lib/slug";
import { deleteBrandAction, saveBrandAction } from "./actions";

type BrandFormProps = {
  brand?: {
    id: string;
    name: string;
    slug: string;
    website: string | null;
    logoPath: string | null;
    logoUrl: string | null;
    productCount: number;
  };
};

export function BrandForm({ brand }: BrandFormProps) {
  const [state, action] = useActionState<ActionState, FormData>(saveBrandAction, {});
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(deleteBrandAction, {});
  const [name, setName] = useState(brand?.name ?? "");
  const [slug, setSlug] = useState(brand?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(brand));
  const [logo, setLogo] = useState({ path: brand?.logoPath ?? "", url: brand?.logoUrl ?? "" });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadLogo(file: File) {
    setUploading(true);
    setUploadError(null);
    const body = new FormData();
    body.set("file", file);
    body.set("kind", "logo");
    try {
      const response = await fetch("/admin/api/upload", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Upload failed");
      setLogo({ path: result.path, url: result.url });
    } catch (error) {
      setUploadError((error as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const effectiveSlug = slugTouched ? slug : slugify(name);

  return (
    <div className="flex flex-col gap-8">
      <form action={action} className="flex flex-col gap-8" noValidate>
        {brand ? <input type="hidden" name="id" value={brand.id} /> : null}
        <input type="hidden" name="logoPath" value={logo.path} />
        <FormMessage state={state} />

        <Panel title="Brand">
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Name" htmlFor="name" errors={state.errors?.name}>
              <input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                {...errorProps("name", state.errors?.name)}
              />
            </Field>
            <Field
              label="Slug"
              htmlFor="slug"
              hint="Used in addresses. Generated from the name until you edit it."
              errors={state.errors?.slug}
            >
              <input
                id="slug"
                name="slug"
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                className={inputClass}
                {...errorProps("slug", state.errors?.slug)}
              />
            </Field>
            <Field
              label="Website"
              htmlFor="website"
              hint="Optional."
              errors={state.errors?.website}
              className="md:col-span-2"
            >
              <input
                id="website"
                name="website"
                type="url"
                inputMode="url"
                defaultValue={state.values?.website ?? brand?.website ?? ""}
                placeholder="https://"
                className={inputClass}
                {...errorProps("website", state.errors?.website)}
              />
            </Field>
          </div>
        </Panel>

        <Panel
          title="Logo"
          aside={<span className="text-xs text-sand-700">SVG or PNG, optional</span>}
        >
          <div className="flex flex-wrap items-center gap-6">
            <div className="grid size-28 place-items-center border border-sand-200 bg-mist">
              {logo.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- preview of a sanitised upload
                <img
                  src={logo.url}
                  alt="Logo preview"
                  className="max-h-20 max-w-24 object-contain"
                />
              ) : (
                <span className="font-latin-display text-3xl text-sand-700">
                  {(name || "?").charAt(0)}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <label className={buttonClass.secondary}>
                {uploading ? "Uploading…" : logo.url ? "Replace logo" : "Upload logo"}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".svg,image/svg+xml,image/png"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
                />
              </label>
              {logo.url ? (
                <button
                  type="button"
                  className={buttonClass.quiet}
                  onClick={() => setLogo({ path: "", url: "" })}
                >
                  Remove logo
                </button>
              ) : null}
              {uploadError ? (
                <p role="alert" className="text-xs text-mocha">
                  {uploadError}
                </p>
              ) : null}
              <p className="text-xs text-sand-700">
                SVG files are cleaned of scripts and external links.
              </p>
            </div>
          </div>
        </Panel>

        <div className="flex gap-3">
          <SubmitButton>{brand ? "Save brand" : "Create brand"}</SubmitButton>
        </div>
      </form>

      {brand ? (
        <form action={deleteAction} className="border-t border-sand-200 pt-8">
          <input type="hidden" name="id" value={brand.id} />
          <FormMessage state={deleteState} />
          <details className="group mt-4">
            <summary className={buttonClass.quiet}>Delete this brand</summary>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <p className="text-sm text-sand-700">
                {brand.productCount > 0
                  ? `It has ${brand.productCount} product${brand.productCount > 1 ? "s" : ""}, so it cannot be deleted yet.`
                  : "This cannot be undone."}
              </p>
              <SubmitButton
                variant="secondary"
                pendingLabel="Deleting…"
                disabled={brand.productCount > 0}
              >
                Delete brand
              </SubmitButton>
            </div>
          </details>
        </form>
      ) : null}
    </div>
  );
}
