"use client";

import { useRef, useState } from "react";
import { MAX_PRODUCT_IMAGES } from "@/lib/admin/constants";
import { cn } from "@/lib/cn";
import { buttonClass, inputClass } from "./ui";

export type ManagedImage = {
  assetId: string;
  thumb: string;
  lqip: string;
  altEn: string;
  altAr: string;
};

/**
 * Product images: multi-file upload (click or drop), drag-and-drop reordering with keyboard
 * alternatives, "set as cover" (= first position) and bilingual alt text. The ordered list is
 * submitted with the product form as JSON in a hidden input.
 */
export function ImageManager({ initial, error }: { initial: ManagedImage[]; error?: string[] }) {
  const [images, setImages] = useState(initial);
  const [uploading, setUploading] = useState(0);
  const [messages, setMessages] = useState<string[]>([]);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const move = (from: number, to: number) =>
    setImages((list) => {
      if (to < 0 || to >= list.length || from === to) return list;
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  const update = (index: number, patch: Partial<ManagedImage>) =>
    setImages((list) => list.map((image, i) => (i === index ? { ...image, ...patch } : image)));

  async function upload(files: FileList | File[]) {
    const room = MAX_PRODUCT_IMAGES - images.length;
    const queue = [...files].slice(0, Math.max(room, 0));
    if (files.length > queue.length)
      setMessages([`Up to ${MAX_PRODUCT_IMAGES} images per product.`]);
    else setMessages([]);

    for (const file of queue) {
      setUploading((n) => n + 1);
      const body = new FormData();
      body.set("file", file);
      body.set("kind", "image");
      try {
        const response = await fetch("/admin/api/upload", { method: "POST", body });
        const result = await response.json().catch(() => ({ error: "Upload failed" }));
        if (!response.ok) throw new Error(`${file.name}: ${result.error ?? "upload failed"}`);
        setImages((list) => [
          ...list,
          { assetId: result.id, thumb: result.thumb, lqip: result.lqip, altEn: "", altAr: "" },
        ]);
      } catch (e) {
        setMessages((m) => [...m, (e as Error).message]);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-5">
      <input
        type="hidden"
        name="images"
        value={JSON.stringify(
          images.map(({ assetId, altEn, altAr }) => ({ assetId, altEn, altAr })),
        )}
      />

      <label
        onDragOver={(e) => {
          if (dragFrom === null) {
            e.preventDefault();
            setDropActive(true);
          }
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(e) => {
          if (dragFrom !== null) return;
          e.preventDefault();
          setDropActive(false);
          upload(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-6 py-10 text-center transition-colors",
          dropActive ? "border-mocha bg-sand-100" : "border-sand bg-white hover:bg-sand-100/50",
        )}
      >
        <span className="font-latin-display text-h3 font-light text-mocha">
          {uploading
            ? `Uploading ${uploading} image${uploading > 1 ? "s" : ""}…`
            : "Drop images here"}
        </span>
        <span className="text-xs text-sand-700">
          or click to choose · JPEG, PNG, WebP or AVIF · up to 15 MB each
        </span>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </label>

      {[...messages, ...(error ?? [])].map((message) => (
        <p key={message} role="alert" className="text-xs text-mocha">
          {message}
        </p>
      ))}

      {images.length > 0 ? (
        <ol className="flex flex-col gap-3" aria-label="Product images, in display order">
          {images.map((image, index) => (
            <li
              key={image.assetId}
              draggable
              onDragStart={() => setDragFrom(index)}
              onDragEnd={() => setDragFrom(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFrom !== null) move(dragFrom, index);
                setDragFrom(null);
              }}
              className={cn(
                "grid gap-4 border border-sand-200 bg-white p-4 md:grid-cols-[auto_1fr_auto] md:items-center",
                dragFrom === index && "opacity-50",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="cursor-grab px-1 text-sand-700 select-none"
                  title="Drag to reorder"
                >
                  ⋮⋮
                </span>
                <div
                  className="size-20 shrink-0 bg-cover bg-center"
                  style={{ backgroundImage: `url("${image.thumb}"), url("${image.lqip}")` }}
                  role="img"
                  aria-label={image.altEn || `Image ${index + 1}`}
                />
                {index === 0 ? <span className="label text-mocha">Cover</span> : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  aria-label={`Image ${index + 1} description, English`}
                  placeholder="Alt text (English)"
                  value={image.altEn}
                  onChange={(e) => update(index, { altEn: e.target.value })}
                  className={inputClass}
                />
                <input
                  aria-label={`Image ${index + 1} description, Arabic`}
                  placeholder="النص البديل (عربي)"
                  dir="rtl"
                  lang="ar"
                  value={image.altAr}
                  onChange={(e) => update(index, { altAr: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                {index > 0 ? (
                  <button
                    type="button"
                    className={buttonClass.quiet}
                    onClick={() => move(index, 0)}
                  >
                    Set as cover
                  </button>
                ) : null}
                <button
                  type="button"
                  className={buttonClass.quiet}
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                  aria-label={`Move image ${index + 1} earlier`}
                >
                  Earlier
                </button>
                <button
                  type="button"
                  className={buttonClass.quiet}
                  disabled={index === images.length - 1}
                  onClick={() => move(index, index + 1)}
                  aria-label={`Move image ${index + 1} later`}
                >
                  Later
                </button>
                <button
                  type="button"
                  className={buttonClass.quiet}
                  onClick={() => setImages((list) => list.filter((_, i) => i !== index))}
                  aria-label={`Remove image ${index + 1}`}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
