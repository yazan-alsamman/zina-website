"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";
import { resolveBag } from "@/lib/shop/bag-actions";
import { bagIdsKey, type BagProduct, useBagStore } from "@/lib/shop/bag-store";

/**
 * Restores the bag from localStorage after mount (so server and client HTML match), keeps tabs
 * in sync, and refreshes names, prices and images from the server whenever the set of products
 * in the bag (or the language) changes. Products that are no longer on sale are dropped.
 */
export function BagProvider() {
  const locale = useLocale();
  const hydrated = useBagStore((s) => s.hydrated);
  const ids = useBagStore((s) => bagIdsKey(s.lines));

  useEffect(() => {
    void Promise.resolve(useBagStore.persist.rehydrate()).then(() =>
      useBagStore.setState({ hydrated: true }),
    );
    const onStorage = (event: StorageEvent) => {
      if (event.key === useBagStore.persist.getOptions().name) {
        void useBagStore.persist.rehydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!ids) {
      useBagStore.setState({ resolvedIds: "" });
      return;
    }

    let cancelled = false;
    resolveBag(useBagStore.getState().lines, locale)
      .then(({ items, removed }) => {
        if (cancelled) return;
        const state = useBagStore.getState();
        const products: Record<string, BagProduct> = {};
        const caps = new Map<string, number>();
        for (const { quantity, ...product } of items) {
          products[product.productId] = product;
          caps.set(product.productId, quantity);
        }
        const gone = new Set(removed);
        const lines = state.lines
          .filter((line) => !gone.has(line.productId))
          .map((line) => ({
            ...line,
            quantity: Math.min(line.quantity, caps.get(line.productId) ?? line.quantity),
          }));
        useBagStore.setState({
          products,
          lines,
          resolvedIds: bagIdsKey(lines),
          removedCount: state.removedCount + removed.length,
        });
      })
      .catch((error) => console.warn("[bag] could not refresh the bag", error));

    return () => {
      cancelled = true;
    };
  }, [hydrated, ids, locale]);

  return null;
}
