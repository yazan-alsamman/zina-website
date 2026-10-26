import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

const links = [
  { href: "/products", key: "products" },
  { href: "/about", key: "about" },
  { href: "/cart", key: "cart" },
] as const;

export function SiteHeader() {
  const t = useTranslations("Navigation");

  return (
    <header className="site-header relative z-20 flex items-center justify-between gap-6 px-gutter py-7">
      <Link href="/" aria-label={t("home")} className="text-(--header-fg)">
        <Wordmark className="text-[clamp(0.8rem,0.7rem+0.35vw,1.05rem)]" />
      </Link>
      <div className="flex items-center gap-6 sm:gap-12">
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
      </div>
    </header>
  );
}
