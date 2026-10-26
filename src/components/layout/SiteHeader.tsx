import { useTranslations } from "next-intl";
import { Suspense } from "react";
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
    <header className="relative z-20 flex items-center justify-between gap-6 px-gutter py-6">
      <Link href="/" className="font-latin-display text-h3 leading-none text-mocha">
        Zina Al Mokri
      </Link>
      <div className="flex items-center gap-6 sm:gap-10">
        <nav aria-label={t("label")} className="hidden sm:block">
          <ul className="flex gap-8 text-caption tracking-[0.08em] uppercase">
            {links.map(({ href, key }) => (
              <li key={key}>
                <Link
                  href={href}
                  className="transition-colors duration-300 ease-luxe hover:text-sand-700"
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
