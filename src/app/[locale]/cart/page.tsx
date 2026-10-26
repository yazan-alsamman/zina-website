import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("CartPage");
  return { title: t("title"), robots: { index: false } };
}

export default function CartPage() {
  const t = useTranslations("CartPage");
  return <PlaceholderPage title={t("title")}>{t("body")}</PlaceholderPage>;
}
