"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { buttonClass, errorProps, Field, FormMessage, inputClass } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/schemas";
import {
  createManualPostAction,
  deleteManualPostAction,
  setHiddenAction,
  syncNowAction,
} from "./actions";

export function SyncNowButton({ disabled }: { disabled?: boolean }) {
  const [state, action] = useActionState<ActionState>(syncNowAction, {});
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <SubmitButton pendingLabel="Syncing…" disabled={disabled}>
        Sync now
      </SubmitButton>
      {state.message ? (
        <p role="status" className="max-w-sm text-end text-xs text-sand-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function PostActions({
  id,
  hidden,
  manual,
}: {
  id: string;
  hidden: boolean;
  manual: boolean;
}) {
  const [hideState, hideAction] = useActionState<ActionState, FormData>(setHiddenAction, {});
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(
    deleteManualPostAction,
    {},
  );
  const message = [hideState, deleteState].find((s) => s.ok === false)?.message;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <form action={hideAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="hidden" value={hidden ? "false" : "true"} />
        <SubmitButton variant="quiet" pendingLabel="Saving…">
          {hidden ? "Show on site" : "Hide"}
        </SubmitButton>
      </form>
      {manual ? (
        <form action={deleteAction}>
          <input type="hidden" name="id" value={id} />
          <SubmitButton variant="quiet" pendingLabel="Deleting…">
            Delete
          </SubmitButton>
        </form>
      ) : null}
      {message ? <p className="text-xs text-sand-700">{message}</p> : null}
    </div>
  );
}

type Uploaded = { id: string; thumb: string };

/** Fallback while the API is not connected: upload an image and link the real post. */
export function ManualPostForm() {
  const [uploaded, setUploaded] = useState<Uploaded | null>(null);
  const [state, action] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await createManualPostAction(prev, formData);
    if (result.ok) setUploaded(null); // ready for the next post
    return result;
  }, {});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const e = state.errors ?? {};

  const upload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("kind", "image");
      const response = await fetch("/admin/api/upload", { method: "POST", body });
      const json = (await response.json()) as Partial<Uploaded> & { error?: string };
      if (!response.ok || !json.id || !json.thumb) throw new Error(json.error ?? "Upload failed.");
      setUploaded({ id: json.id, thumb: json.thumb });
    } catch (error) {
      setUploaded(null);
      setUploadError((error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form action={action} className="grid gap-6 md:grid-cols-[10rem_1fr]" noValidate>
      <div>
        <label
          htmlFor="manual-image"
          className="relative grid aspect-[4/5] cursor-pointer place-items-center overflow-hidden border border-dashed border-sand bg-sand-100 text-center text-xs text-sand-700 hover:border-mocha"
        >
          {uploaded ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail from our media route
            <img src={uploaded.thumb} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <span className="px-3">{uploading ? "Uploading…" : "Choose an image"}</span>
          )}
        </label>
        <input
          id="manual-image"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <input type="hidden" name="assetId" value={uploaded?.id ?? ""} />
        {uploadError || e.assetId ? (
          <p className="mt-2 text-xs text-sand-700">{uploadError ?? e.assetId?.[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-5">
        <FormMessage state={state.errors ? {} : state} />
        <Field label="Post link" htmlFor="permalink" errors={e.permalink}>
          <input
            id="permalink"
            name="permalink"
            type="url"
            placeholder="https://www.instagram.com/p/…"
            defaultValue={state.ok ? "" : state.values?.permalink}
            className={inputClass}
            {...errorProps("permalink", e.permalink)}
          />
        </Field>
        <Field label="Caption" htmlFor="caption" hint="Optional." errors={e.caption}>
          <textarea
            id="caption"
            name="caption"
            rows={3}
            defaultValue={state.ok ? "" : state.values?.caption}
            className={inputClass}
            {...errorProps("caption", e.caption)}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Type" htmlFor="mediaType">
            <select id="mediaType" name="mediaType" defaultValue="IMAGE" className={inputClass}>
              <option value="IMAGE">Photo</option>
              <option value="CAROUSEL_ALBUM">Carousel</option>
              <option value="VIDEO">Reel / video (poster image)</option>
            </select>
          </Field>
          <Field label="Posted on" htmlFor="postedOn" hint="Defaults to today." errors={e.postedOn}>
            <input
              id="postedOn"
              name="postedOn"
              type="date"
              className={inputClass}
              {...errorProps("postedOn", e.postedOn)}
            />
          </Field>
        </div>
        <div>
          <SubmitButton pendingLabel="Adding…" disabled={!uploaded || uploading}>
            Add post
          </SubmitButton>
          <span className={`${buttonClass.quiet} ms-4 no-underline`}>
            Shown until you hide or delete it.
          </span>
        </div>
      </div>
    </form>
  );
}
