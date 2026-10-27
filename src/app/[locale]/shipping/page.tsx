import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/layout/LegalPage";
import { routing } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/shipping">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("Pages");
  return {
    title: t("shipping.title"),
    description: t("shipping.lead"),
    alternates: {
      canonical: `/${locale}/shipping`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/shipping`])),
    },
  };
}

export default function Page() {
  return <LegalPage page="shipping" />;
}
