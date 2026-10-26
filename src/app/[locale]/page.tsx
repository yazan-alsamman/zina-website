import { useTranslations } from "next-intl";
import { HeroSphereStage } from "@/components/home/HeroSphereStage";

export default function HomePage() {
  const t = useTranslations("HomePage");

  return (
    <main id="main" className="relative isolate flex flex-1 flex-col">
      {/* Temporary R3F pipeline check; replaced by the real landing in step 03. */}
      <section className="relative grid min-h-[calc(100dvh-6rem)] place-items-center overflow-hidden px-gutter">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,var(--color-sand-100),var(--color-white)_70%)]" />
        <div className="absolute inset-0 -z-10">
          <HeroSphereStage />
        </div>
        <div className="pointer-events-none text-center">
          <p className="text-caption tracking-[0.24em] text-sand-700 uppercase">{t("eyebrow")}</p>
          <h1 className="mt-4 font-latin-display text-display text-mocha">{t("title")}</h1>
          <p className="mt-6 text-lead text-mocha">{t("subtitle")}</p>
        </div>
      </section>
    </main>
  );
}
