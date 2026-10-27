"use client";

import { useTranslations } from "next-intl";
import { type KeyboardEvent, useEffect, useRef, useState, ViewTransition } from "react";
import { SmartImage } from "@/components/media/SmartImage";
import { cn } from "@/lib/cn";
import { getLenis } from "@/lib/lenis";
import type { SmartAsset } from "@/lib/shop/types";
import { productImageTransition } from "./ProductCard";

type GalleryImage = { asset: SmartAsset; alt: string };

/**
 * Product images: a swipeable, scroll-snapping strip (touch, trackpad, keyboard) with
 * thumbnails, and a full-screen lightbox in a native <dialog> (focus trap, Escape, focus return).
 */
export function ProductGallery({
  productId,
  images,
}: {
  productId: string;
  images: GalleryImage[];
}) {
  const t = useTranslations("Product");
  const stripRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState<number | null>(null);
  const total = images.length;

  // Which slide is mostly in view (works for swipe, scroll and thumbnail clicks, LTR and RTL).
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root: strip, threshold: 0.6 },
    );
    strip.querySelectorAll("[data-index]").forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [total]);

  const show = (index: number) => {
    const slide = stripRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    slide?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  };

  const openZoom = (index: number) => {
    setZoomed(index);
    dialogRef.current?.showModal();
    getLenis()?.stop();
  };

  const step = (delta: number) =>
    setZoomed((current) => (current === null ? current : (current + delta + total) % total));

  const onDialogKey = (event: KeyboardEvent<HTMLDialogElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    if (event.key === "ArrowRight") step(rtl ? -1 : 1);
    if (event.key === "ArrowLeft") step(rtl ? 1 : -1);
  };

  if (total === 0) {
    return <div aria-hidden className="media-sand grain relative aspect-[4/5]" />;
  }

  return (
    <section aria-label={t("gallery")}>
      <div
        ref={stripRef}
        className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
        tabIndex={0}
        aria-label={t("imageCount", { index: active + 1, total })}
      >
        {images.map((image, index) => (
          <div
            key={image.asset.dir}
            data-index={index}
            className="relative aspect-[4/5] w-full shrink-0 snap-start overflow-hidden bg-sand-100"
          >
            <button
              type="button"
              onClick={() => openZoom(index)}
              aria-label={t("openImage", { index: index + 1, total })}
              data-cursor-label="+"
              className="absolute inset-0 block size-full cursor-zoom-in"
            >
              {index === 0 ? (
                <ViewTransition
                  name={productImageTransition(productId)}
                  share="morph"
                  default="none"
                >
                  <div className="absolute inset-0">
                    <SmartImage
                      asset={image.asset}
                      alt={image.alt}
                      sizes="(min-width: 1024px) 55vw, 100vw"
                      priority
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                </ViewTransition>
              ) : (
                <SmartImage
                  asset={image.asset}
                  alt={image.alt}
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </button>
          </div>
        ))}
      </div>

      {total > 1 ? (
        <div className="mt-4 flex items-center gap-3">
          {images.map((image, index) => (
            <button
              key={image.asset.dir}
              type="button"
              onClick={() => show(index)}
              aria-label={t("showImage", { index: index + 1 })}
              aria-current={index === active ? "true" : undefined}
              className={cn(
                "relative aspect-[4/5] w-14 overflow-hidden border transition-[border-color,opacity] duration-500 sm:w-16",
                index === active
                  ? "border-mocha"
                  : "border-transparent opacity-60 hover:opacity-100",
              )}
            >
              <SmartImage
                asset={image.asset}
                alt=""
                sizes="64px"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </button>
          ))}
          <p aria-hidden className="ms-auto font-latin-display text-sm text-sand-700 lining-nums">
            {active + 1} / {total}
          </p>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-label={t("gallery")}
        onKeyDown={onDialogKey}
        onClose={() => {
          setZoomed(null);
          getLenis()?.start();
        }}
        className="lightbox m-0 h-dvh max-h-none w-dvw max-w-none bg-mocha-900 p-0 text-white backdrop:bg-mocha-900/90"
        data-lenis-prevent
      >
        {zoomed !== null ? (
          <div className="relative flex size-full items-center justify-center">
            <div className="relative h-[86dvh] w-[min(92vw,calc(86dvh*0.8))]">
              <SmartImage
                asset={images[zoomed].asset}
                alt={images[zoomed].alt}
                sizes="92vw"
                priority
                className="absolute inset-0 h-full w-full object-contain"
              />
            </div>

            <p className="absolute start-6 top-6 font-latin-display text-sm text-sand-200 lining-nums">
              {t("imageCount", { index: zoomed + 1, total })}
            </p>
            <form method="dialog" className="absolute end-4 top-4">
              <button
                type="submit"
                autoFocus
                aria-label={t("close")}
                className="grid size-12 place-items-center rounded-full border border-white/25 text-white transition-colors hover:bg-white hover:text-mocha"
              >
                <svg aria-hidden viewBox="0 0 16 16" className="size-4">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </button>
            </form>
            {total > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label={t("previous")}
                  className="absolute start-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-white/25 hover:bg-white hover:text-mocha"
                >
                  <svg aria-hidden viewBox="0 0 16 16" className="size-4 rtl:-scale-x-100">
                    <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label={t("next")}
                  className="absolute end-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-white/25 hover:bg-white hover:text-mocha"
                >
                  <svg aria-hidden viewBox="0 0 16 16" className="size-4 rtl:-scale-x-100">
                    <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </section>
  );
}
