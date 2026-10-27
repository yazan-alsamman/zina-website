"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import { getLenis } from "@/lib/lenis";
import { bagCount, useBagStore } from "@/lib/shop/bag-store";
import { BagContents } from "./BagContents";

/**
 * Slide-in bag from the inline end (right in English, left in Arabic). A modal <dialog>: focus
 * is trapped and restored, Escape and a click on the backdrop close it, the page behind is
 * inert. The slide is CSS (see .bag-drawer in globals.css) and falls back to a plain
 * appearance where @starting-style is unsupported.
 */
export function BagDrawer() {
  const t = useTranslations("Bag");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = useBagStore((s) => s.drawerOpen);
  const count = useBagStore((s) => bagCount(s.lines));
  const closeDrawer = useBagStore((s) => s.closeDrawer);
  const pathname = usePathname();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      getLenis()?.stop();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Any navigation (a product link, checkout) closes the drawer.
  useEffect(() => {
    useBagStore.getState().closeDrawer();
  }, [pathname]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="bag-title"
      className="bag-drawer bg-white text-mocha"
      onClose={() => {
        closeDrawer();
        getLenis()?.start();
      }}
      onClick={(event) => {
        // The dialog element itself only receives clicks on its ::backdrop.
        if (event.target === event.currentTarget) closeDrawer();
      }}
      data-lenis-prevent
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-sand-200 px-6 py-6 sm:px-8">
          <h2 id="bag-title" className="font-display text-h3 text-mocha">
            {t("title")}
            {count > 0 ? (
              <span className="ms-3 align-middle font-latin-display text-lg text-sand-700 lining-nums">
                ({count})
              </span>
            ) : null}
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label={t("close")}
            className="grid size-11 place-items-center rounded-full border border-sand-200 text-mocha transition-colors hover:border-mocha"
          >
            <svg aria-hidden viewBox="0 0 16 16" className="size-3.5">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </header>
        <BagContents variant="drawer" onNavigate={closeDrawer} />
      </div>
    </dialog>
  );
}
