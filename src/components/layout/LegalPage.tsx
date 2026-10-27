import { getTranslations } from "next-intl/server";

type Section = { title: string; body: string };

/**
 * Shipping, privacy and terms. The copy is placeholder text, clearly marked as a draft until the
 * owner (and a lawyer) have reviewed it.
 */
export async function LegalPage({ page }: { page: "shipping" | "privacy" | "terms" }) {
  const t = await getTranslations("Pages");
  const sections = t.raw(`${page}.sections`) as Section[];

  return (
    <main id="main" className="mx-auto w-full max-w-content flex-1 px-gutter pt-10 pb-section">
      <div className="grid gap-12 lg:grid-cols-12">
        <header className="lg:col-span-4">
          <p className="label inline-block border border-sand px-3 py-1.5 text-sand-700">
            {t("draft")}
          </p>
          <h1 className="mt-6 text-h1 text-mocha">{t(`${page}.title`)}</h1>
          <p className="mt-4 text-sm text-sand-700">{t("draftNote")}</p>
        </header>
        <div className="lg:col-span-7 lg:col-start-6">
          <p className="text-lead text-mocha">{t(`${page}.lead`)}</p>
          <ol className="mt-14 flex flex-col">
            {sections.map((section, index) => (
              <li
                key={section.title}
                className="grid gap-3 border-t border-sand-200 py-8 sm:grid-cols-[3rem_1fr]"
              >
                <span aria-hidden className="font-latin-display text-lg text-sand-700 lining-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2 className="text-h3 text-mocha">{section.title}</h2>
                  <p className="mt-3 max-w-prose text-body text-mocha">{section.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </main>
  );
}
