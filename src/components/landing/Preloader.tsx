"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useRef } from "react";
import { Logo } from "@/components/brand/Logo";
import { MAISON } from "@/components/brand/maison.generated";
import { useLandingStore } from "@/lib/landing-store";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { getLenis } from "@/lib/lenis";

const MIN_DURATION = 2.8; // seconds: the arch, the Ƶ and the name have drawn in
const MAX_DURATION = 6; // never hold visitors hostage to a slow GPU
const SESSION_KEY = "zm-intro";

function markSeen() {
  document.documentElement.dataset.intro = "seen";
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Private mode: the intro simply plays again next time.
  }
}

/**
 * Once-per-session intro: the logo draws itself (the arch in one stroke, then the Ƶ and its sand
 * cross-stroke, then the name rising letter by letter) while a hairline tracks real load progress
 * (3D chunk, drei useProgress, first rendered frame), then a curtain lifts into the hero.
 * The parts start hidden in CSS (globals.css) so nothing flashes before hydration.
 */
export function Preloader() {
  const t = useTranslations("Preloader");
  const script = useLocale() === "ar" ? "arabic" : "latin";
  const clipId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const root = rootRef.current;
    const mark = markRef.current;
    const line = lineRef.current;
    const count = countRef.current;
    if (!root || !mark || !line || !count) return;

    const store = useLandingStore.getState();
    const skip =
      document.documentElement.dataset.intro === "seen" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (skip) {
      gsap.set(root, { display: "none" });
      store.set({ introDone: true });
      return;
    }

    const html = document.documentElement;
    html.style.overflow = "hidden";
    window.scrollTo(0, 0);
    getLenis()?.stop();

    const part = (name: string) => mark.querySelectorAll<SVGElement>(`[data-logo="${name}"]`);
    const [arch, z, cross, word, glyphs] = ["arch", "z", "cross", "word", "glyph"].map(part);
    // In the word's own units: a glyph height and a little more, below the mask.
    const drop = MAISON[script].height * 1.3;
    gsap.set(word, { opacity: 1 });
    gsap.set(glyphs, { y: drop });
    const intro = gsap
      .timeline({ delay: 0.15 })
      .fromTo(arch, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.5, ease: "silk" })
      .fromTo(z, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.9 }, "-=0.55")
      .fromTo(
        cross,
        { opacity: 0, scaleX: 0, transformOrigin: "50% 50%" },
        { opacity: 1, scaleX: 1, duration: 0.7, ease: "silk" },
        "-=0.5",
      )
      .to(glyphs, { y: 0, stagger: 0.045, duration: 1.1 }, "-=0.35");

    const started = performance.now();
    let shown = 0;
    let exiting = false;

    const finish = () => {
      html.style.overflow = "";
      getLenis()?.start();
      markSeen();
      // Pins were measured while scrolling was locked; re-measure against the live viewport.
      ScrollTrigger.refresh();
    };

    const exit = () => {
      exiting = true;
      gsap.ticker.remove(tick);
      gsap
        .timeline({ onComplete: () => gsap.set(root, { display: "none" }) })
        .to(line, { scaleX: 1, duration: 0.35, ease: "power2.out" })
        // A slow device may still be drawing: settle the logo before it leaves.
        .add(() => {
          intro.progress(1);
        })
        .to(glyphs, { y: -drop, stagger: 0.02, duration: 0.7, ease: "silk" }, "+=0.1")
        .to([arch, z, cross], { opacity: 0, duration: 0.6, ease: "silk" }, "<0.1")
        .to(count, { autoAlpha: 0, duration: 0.3 }, "<")
        .to(root, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.25, ease: "silk" }, "-=0.25")
        // Let the hero begin while the curtain is still lifting.
        .add(() => {
          useLandingStore.getState().set({ introDone: true });
          finish();
        }, "-=0.85");
    };

    const tick = () => {
      if (exiting) return;
      const elapsed = (performance.now() - started) / 1000;
      const { loadProgress, sceneReady } = useLandingStore.getState();
      // Real progress, but never visibly stalled: a gentle time floor keeps the line moving.
      const target = Math.max(loadProgress, Math.min(elapsed / 4, 0.85));
      shown += (target - shown) * 0.08;
      gsap.set(line, { scaleX: shown });
      count.textContent = String(Math.round(shown * 100)).padStart(2, "0");

      if ((sceneReady && elapsed > MIN_DURATION && shown > 0.9) || elapsed > MAX_DURATION) exit();
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      intro.kill();
      if (!exiting) finish();
    };
  });

  return (
    <div
      ref={rootRef}
      role="status"
      aria-label={t("loading")}
      className="preloader fixed inset-0 z-50 grid place-items-center bg-mocha text-white [clip-path:inset(0%_0%_0%_0%)]"
    >
      <div className="flex flex-col items-center gap-8">
        <div ref={markRef} className="[--logo-accent:var(--color-sand-200)]">
          <Logo
            decorative
            layout="stacked"
            script={script}
            clipId={clipId}
            className="h-[clamp(9rem,6rem+12vh,13rem)]"
          />
        </div>
        <div className="h-px w-[min(56vw,18rem)] bg-white/15">
          <div ref={lineRef} className="h-full origin-left scale-x-0 bg-sand rtl:origin-right" />
        </div>
        <span
          ref={countRef}
          aria-hidden
          className="font-sans text-caption text-sand-200 tabular-nums"
        >
          00
        </span>
      </div>
    </div>
  );
}
