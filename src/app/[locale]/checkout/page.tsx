import { getCountryCallingCode, isSupportedCountry } from "libphonenumber-js";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { countryOptions, phoneCountryOptions } from "@/lib/shop/countries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Checkout");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const { locale } = await params;
  const t = await getTranslations("Checkout");
  // Country names and calling codes are prepared here, so the phone library stays on the server.
  const countries = countryOptions(locale).map(({ code, name }) => ({ code, label: name }));
  const phoneCountries = phoneCountryOptions(locale, (code) =>
    isSupportedCountry(code) ? getCountryCallingCode(code) : null,
  );

  return (
    <main id="main" className="mx-auto w-full max-w-[84rem] flex-1 px-gutter pt-10 pb-section">
      <header className="pb-12">
        <p className="label text-sand-700">{t("overline")}</p>
        <h1 className="mt-5 text-h1 text-mocha">{t("title")}</h1>
      </header>
      <CheckoutForm countries={countries} phoneCountries={phoneCountries} />
    </main>
  );
}
