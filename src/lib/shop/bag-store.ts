"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { BagItem } from "./bag-actions";
import { type BagLine, MAX_QUANTITY, normalizeLines } from "./pricing";

/** Server data for a bag line (everything except the quantity, which the bag owns). */
export type BagProduct = Omit<BagItem, "quantity">;

/**
 * localStorage can be missing or throw (private mode, blocked site data, quota). Every access is
 * guarded so the bag simply stops persisting instead of breaking the page.
 */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // Not persisted this time; the in-memory bag still works.
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

type BagState = {
  /** Product ids and quantities only: names and prices are always fetched from the server. */
  lines: BagLine[];
  drawerOpen: boolean;
  /** Set once the persisted bag has been read (the server render always shows an empty bag). */
  hydrated: boolean;
  /** Bumped on every add, so the header count can animate. */
  addedAt: number;
  /** Fresh names, prices and images from the server, keyed by product id (see BagProvider). */
  products: Record<string, BagProduct>;
  /** Product ids the last server check was for; lines outside it are still loading. */
  resolvedIds: string;
  /** How many lines were dropped because their product is no longer available. */
  removedCount: number;
};

type BagActions = {
  add: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  replace: (lines: BagLine[]) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  dismissNotice: () => void;
};

export const useBagStore = create<BagState & BagActions>()(
  persist(
    (set) => ({
      lines: [],
      drawerOpen: false,
      hydrated: false,
      addedAt: 0,
      products: {},
      resolvedIds: "",
      removedCount: 0,
      add: (productId, quantity = 1) =>
        set((state) => ({
          lines: normalizeLines([...state.lines, { productId, quantity }]),
          addedAt: Date.now(),
        })),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          lines: state.lines.map((line) =>
            line.productId === productId
              ? { ...line, quantity: Math.max(1, Math.min(MAX_QUANTITY, Math.trunc(quantity))) }
              : line,
          ),
        })),
      remove: (productId) =>
        set((state) => ({ lines: state.lines.filter((line) => line.productId !== productId) })),
      replace: (lines) => set({ lines: normalizeLines(lines) }),
      clear: () => set({ lines: [] }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      dismissNotice: () => set({ removedCount: 0 }),
    }),
    {
      name: "zm-bag",
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => ({ lines: state.lines }),
      // Hydrated manually after mount (BagProvider) to keep server and client HTML identical.
      skipHydration: true,
      merge: (persisted, current) => {
        const lines = (persisted as { lines?: unknown } | undefined)?.lines;
        const valid = Array.isArray(lines)
          ? lines.filter(
              (line): line is BagLine =>
                typeof line?.productId === "string" && typeof line?.quantity === "number",
            )
          : [];
        return { ...current, lines: normalizeLines(valid) };
      },
    },
  ),
);

export const bagCount = (lines: readonly BagLine[]) =>
  lines.reduce((sum, line) => sum + line.quantity, 0);

/** Stable key for "which products are in the bag" (quantities excluded). */
export const bagIdsKey = (lines: readonly BagLine[]) =>
  lines
    .map((line) => line.productId)
    .sort()
    .join(",");
