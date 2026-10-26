"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

const nativeNames: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

/** Links to the same path in every other locale (real anchors, so it works without JS). */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("LanguageSwitcher");
  const pathname = usePathname();
  const current = useLocale();

  return (
    <nav aria-label={t("label")} className={cn("flex items-center gap-3", className)}>
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          lang={locale}
          hrefLang={locale}
          aria-current={locale === current ? "true" : undefined}
          className={cn(
            "text-caption tracking-[0.08em] uppercase transition-colors duration-300 ease-luxe",
            locale === current
              ? "text-mocha underline decoration-sand underline-offset-4"
              : "text-sand-700 hover:text-mocha",
          )}
        >
          {nativeNames[locale]}
        </Link>
      ))}
    </nav>
  );
}
