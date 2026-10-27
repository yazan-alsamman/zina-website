"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

const nativeNames: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

/**
 * Links to the same path in every other locale (real anchors, so it works without JS).
 * Colours come from `--header-fg` / `--header-muted`, set by the header or footer it sits in.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("LanguageSwitcher");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = useLocale();
  // Keep the query: filters on the collection, the private token on an order page.
  const query = Object.fromEntries(searchParams.entries());

  return (
    <nav aria-label={t("label")} className={cn("flex items-center gap-5", className)}>
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={{ pathname, query }}
          locale={locale}
          lang={locale}
          hrefLang={locale}
          aria-current={locale === current ? "true" : undefined}
          className={cn(
            "label border-b pb-1 transition-colors duration-500 ease-luxe",
            locale === current
              ? "border-current text-(--header-fg)"
              : "border-transparent text-(--header-muted) hover:text-(--header-fg)",
          )}
        >
          {nativeNames[locale]}
        </Link>
      ))}
    </nav>
  );
}
