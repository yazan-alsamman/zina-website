import { useTranslations } from "next-intl";
import { Magnetic } from "@/components/motion/Magnetic";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { HeroMotion } from "./HeroMotion";

export function HeroSection() {
  const t = useTranslations("Hero");

  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-gutter pt-24 pb-16 text-white rtl:items-start md:rtl:ps-[9vw]"
    >
      <HeroMotion>
        <h1
          id="hero-title"
          className="hero-title flex flex-col font-display text-hero font-light text-white"
        >
          <SplitReveal as="span" mode="intro" className="block self-start">
            {t("titleFirst")}
          </SplitReveal>
          {/* LTR: the second line steps to the right. RTL: both lines hang from the right edge
              and the second steps inward, the Arabic counterpart of the English stagger. */}
          <SplitReveal
            as="span"
            mode="intro"
            delay={0.14}
            className="block self-end ps-[0.9em] rtl:self-start rtl:ps-[1.15em]"
          >
            {t("titleSecond")}
          </SplitReveal>
        </h1>

        <SplitReveal
          as="p"
          mode="intro"
          delay={0.4}
          className="mt-8 max-w-[30ch] text-center text-lead text-balance text-sand-100 md:mt-10 rtl:text-start"
        >
          {t("tagline")}
        </SplitReveal>

        <div data-hero-late className="mt-10">
          <Magnetic>
            <a
              href="#edit"
              data-cursor-label={t("cta")}
              className="group inline-flex items-center gap-4 border-b border-sand/60 pb-2 text-white transition-colors duration-500 ease-luxe hover:border-white"
            >
              <span className="label">{t("cta")}</span>
            </a>
          </Magnetic>
        </div>
      </HeroMotion>

      {/* Scroll cue: a hairline that slowly draws downward */}
      <div
        data-hero-late
        aria-hidden
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-sand-200 md:flex"
      >
        <span className="label">{t("scroll")}</span>
        <span className="relative block h-12 w-px overflow-hidden bg-white/15">
          <span className="absolute inset-x-0 top-0 h-1/2 animate-[cue_2.4s_var(--ease-silk)_infinite] bg-sand-200" />
        </span>
      </div>
    </section>
  );
}
