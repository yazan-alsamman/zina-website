import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/layout/LegalPage";
import { routing } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/terms">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("Pages");
  return {
    title: t("terms.title"),
    description: t("terms.lead"),
    alternates: {
      canonical: `/${locale}/terms`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/terms`])),
    },
  };
}

export default function Page() {
  return <LegalPage page="terms" />;
}
