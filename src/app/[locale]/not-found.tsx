import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function LocaleNotFound() {
  const t = useTranslations("NotFound");

  return (
    <main id="main" className="mx-auto w-full max-w-content flex-1 px-gutter py-section">
      <p className="text-caption tracking-[0.24em] text-sand-700 uppercase">404</p>
      <h1 className="mt-4 text-h1 text-mocha">{t("title")}</h1>
      <p className="mt-6 max-w-prose text-lead">{t("body")}</p>
      <Link
        href="/"
        className="mt-10 inline-block border-b border-sand pb-1 text-caption tracking-[0.08em] uppercase"
      >
        {t("back")}
      </Link>
    </main>
  );
}
