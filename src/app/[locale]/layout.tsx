import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CustomCursor } from "@/components/motion/CustomCursor";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { getDirection, routing } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

// Runs before first paint: hides the preloader for the rest of the session once it has played.
const INTRO_FLAG_SCRIPT = `try{if(sessionStorage.getItem("zm-intro"))document.documentElement.dataset.intro="seen"}catch(e){}`;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  return {
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
    title: { default: t("title"), template: `%s · ${t("title")}` },
    description: t("description"),
    alternates: {
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#4a3f35",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations("Navigation");

  return (
    // The intro flag script may add data-intro before hydration.
    <html
      lang={locale}
      dir={getDirection(locale)}
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_FLAG_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <a
            href="#main"
            className="label fixed start-4 top-4 z-[70] -translate-y-24 bg-white px-4 py-3 text-mocha focus:translate-y-0"
          >
            {t("skip")}
          </a>
          <SmoothScroll />
          <CustomCursor />
          <SiteHeader />
          {children}
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
