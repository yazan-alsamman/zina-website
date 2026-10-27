import { useLocale, useTranslations } from "next-intl";
import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { BagButton } from "@/components/shop/BagButton";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

const links = [
  { href: "/products", key: "products" },
  { href: "/about", key: "about" },
] as const;

export function SiteHeader() {
  const t = useTranslations("Navigation");
  const locale = useLocale();

  return (
    <header className="site-header relative z-20 flex items-center justify-between gap-6 px-gutter py-7">
      <Link href="/" aria-label={t("home")} className="text-(--header-fg)">
        <Logo
          decorative
          script={locale === "ar" ? "arabic" : "latin"}
          className="h-[clamp(2.1rem,1.8rem+0.9vw,2.8rem)]"
        />
      </Link>
      <div className="flex items-center gap-5 sm:gap-12">
        <nav aria-label={t("label")} className="hidden sm:block">
          <ul className="flex gap-9">
            {links.map(({ href, key }) => (
              <li key={key}>
                <Link
                  href={href}
                  className="label text-(--header-muted) transition-colors duration-500 ease-luxe hover:text-(--header-fg)"
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* usePathname is request-specific on dynamic routes; keep it out of the static shell. */}
        <Suspense fallback={<div className="h-5 w-32" />}>
          <LanguageSwitcher />
        </Suspense>
        <BagButton />
      </div>
    </header>
  );
}
