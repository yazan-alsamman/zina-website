"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useBagStore } from "@/lib/shop/bag-store";
import { MAX_QUANTITY } from "@/lib/shop/pricing";
import { QuantityStepper } from "./QuantityStepper";

export function AddToBag({ productId, stock }: { productId: string; stock: number | null }) {
  const t = useTranslations("Shop");
  const add = useBagStore((s) => s.add);
  const openDrawer = useBagStore((s) => s.openDrawer);
  const inBag = useBagStore(
    (s) => s.lines.find((line) => line.productId === productId)?.quantity ?? 0,
  );
  const [quantity, setQuantity] = useState(1);
  const cap = Math.min(MAX_QUANTITY, stock ?? MAX_QUANTITY);
  const available = Math.max(0, cap - inBag);
  const soldOut = stock === 0;

  return (
    <div className="flex flex-wrap items-center gap-4">
      {!soldOut ? (
        <QuantityStepper
          value={Math.min(quantity, Math.max(1, available))}
          max={Math.max(1, available)}
          onChange={(next) => setQuantity(Math.max(1, Math.min(next, available)))}
          label={t("quantity")}
        />
      ) : null}
      <button
        type="button"
        disabled={soldOut || available === 0}
        onClick={() => {
          add(productId, Math.min(quantity, available));
          setQuantity(1);
          openDrawer();
        }}
        className="min-h-11 flex-1 rounded-full bg-mocha px-8 py-3.5 text-sm tracking-[0.04em] text-white transition-colors duration-500 ease-luxe hover:bg-mocha-800 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-sand-700 sm:min-w-56 sm:flex-none"
      >
        {soldOut ? t("outOfStock") : t("addToBag")}
      </button>
    </div>
  );
}
