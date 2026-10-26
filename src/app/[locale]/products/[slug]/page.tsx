import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

type Params = PageProps<"/[locale]/products/[slug]">["params"];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ProductPage");
  return { title: t("title") };
}

async function ProductDetails({ params }: { params: Params }) {
  const { slug } = await params;
  const t = await getTranslations("ProductPage");
  return <p>{t("body", { slug: decodeURIComponent(slug) })}</p>;
}

export default function ProductPage({ params }: PageProps<"/[locale]/products/[slug]">) {
  const t = useTranslations("ProductPage");

  return (
    <PlaceholderPage title={t("title")}>
      {/* The slug is only known per request; stream it behind the static shell. */}
      <Suspense fallback={<p className="h-lh" />}>
        <ProductDetails params={params} />
      </Suspense>
    </PlaceholderPage>
  );
}
