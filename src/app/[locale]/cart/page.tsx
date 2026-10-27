import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { BagContents } from "@/components/shop/BagContents";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Bag");
  return { title: t("title"), robots: { index: false } };
}

export default function CartPage() {
  const t = useTranslations("Bag");

  return (
    <main id="main" className="mx-auto w-full max-w-content flex-1 px-gutter pt-10 pb-section">
      <h1 className="text-h1 text-mocha">{t("title")}</h1>
      <div className="mt-12 border-t border-sand-200 pt-2">
        <BagContents variant="page" />
      </div>
    </main>
  );
}
