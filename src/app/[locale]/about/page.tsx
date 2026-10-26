import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AboutPage");
  return { title: t("title") };
}

export default function AboutPage() {
  const t = useTranslations("AboutPage");
  return <PlaceholderPage title={t("title")}>{t("body")}</PlaceholderPage>;
}
