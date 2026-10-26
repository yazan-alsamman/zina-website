import { useTranslations } from "next-intl";
import { RevealGroup } from "@/components/motion/RevealGroup";
import { SplitReveal } from "@/components/motion/SplitReveal";

const STEPS = ["choose", "confirm", "deliver"] as const;
const PAYMENTS = ["cod", "card", "whatsapp"] as const;

export function OrderingSection() {
  const t = useTranslations("Ordering");

  return (
    <section
      id="ordering"
      aria-labelledby="ordering-title"
      className="relative z-10 bg-white text-mocha"
    >
      <div className="mx-auto max-w-content px-gutter py-section">
        <SplitReveal id="ordering-title" className="max-w-[18ch] text-h1">
          {t("title")}
        </SplitReveal>

        <RevealGroup as="ol" className="mt-16 grid gap-12 md:mt-24 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, i) => (
            <li key={step} data-reveal className="border-t border-sand-200 pt-8">
              {/* A real sequence, so the numerals carry meaning. */}
              <span
                aria-hidden
                className="block font-latin-display text-display leading-none font-light text-sand-700"
              >
                {i + 1}
              </span>
              <h3 className="mt-6 text-h3">{t(`steps.${step}.title`)}</h3>
              <p className="mt-3 max-w-[34ch] text-body text-mocha">{t(`steps.${step}.body`)}</p>
            </li>
          ))}
        </RevealGroup>

        <RevealGroup className="mt-20 flex flex-col gap-6 md:flex-row md:items-center md:gap-12">
          <p data-reveal className="text-lead">
            {t("paymentTitle")}
          </p>
          <ul data-reveal className="flex flex-wrap gap-3">
            {PAYMENTS.map((method) => (
              <li
                key={method}
                className="rounded-full border border-sand-200 px-5 py-2.5 text-sm text-mocha"
              >
                {t(`payment.${method}`)}
              </li>
            ))}
          </ul>
        </RevealGroup>
      </div>
    </section>
  );
}
