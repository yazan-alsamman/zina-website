import { getTranslations } from "next-intl/server";
import { cacheLife } from "next/cache";
import { Suspense } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { site } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

async function getYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

const links = [
  { href: "/products", key: "products" },
  { href: "/about", key: "about" },
  { href: "/cart", key: "cart" },
] as const;

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const nav = await getTranslations("Navigation");
  const year = await getYear();

  return (
    <footer className="site-footer relative z-10 overflow-hidden bg-mocha text-white">
      <div className="px-gutter pt-section">
        <Link href="/" aria-label={nav("home")} className="block text-center">
          <Wordmark className="text-[min(7.1vw,8.5rem)] font-light text-sand-100" />
        </Link>

        <div className="mt-16 grid gap-10 border-t border-white/15 py-10 md:grid-cols-[1fr_auto_auto] md:items-center md:gap-14">
          <nav aria-label={t("navLabel")}>
            <ul className="flex flex-wrap gap-x-8 gap-y-3">
              {links.map(({ href, key }) => (
                <li key={key}>
                  <Link
                    href={href}
                    className="label text-sand-200 transition-colors duration-500 ease-luxe hover:text-white"
                  >
                    {nav(key)}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href={site.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="label text-sand-200 transition-colors duration-500 ease-luxe hover:text-white"
                >
                  {t("instagram")}
                </a>
              </li>
            </ul>
          </nav>
          <Suspense fallback={<div className="h-5 w-32" />}>
            <LanguageSwitcher />
          </Suspense>
          <p className="text-sm text-sand-200">{t("rights", { year })}</p>
        </div>
      </div>
    </footer>
  );
}
