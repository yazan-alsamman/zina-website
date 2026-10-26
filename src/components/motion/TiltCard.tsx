"use client";

import { type ReactNode, useRef } from "react";
import { cn } from "@/lib/cn";
import { gsap, useGSAP } from "@/lib/gsap";

const FINE_POINTER =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

/** Tilts toward the pointer in 3D with a soft moving sheen. Static on touch / reduced motion. */
export function TiltCard({
  children,
  className,
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const el = ref.current;
      const sheen = sheenRef.current;
      if (!el || !sheen || !contextSafe) return;

      const mm = gsap.matchMedia();
      mm.add(FINE_POINTER, () => {
        gsap.set(el, { transformPerspective: 900, transformOrigin: "50% 50%" });
        const rx = gsap.quickTo(el, "rotationX", { duration: 0.8, ease: "power3.out" });
        const ry = gsap.quickTo(el, "rotationY", { duration: 0.8, ease: "power3.out" });

        const onMove = contextSafe((event: PointerEvent) => {
          const rect = el.getBoundingClientRect();
          const px = (event.clientX - rect.left) / rect.width - 0.5;
          const py = (event.clientY - rect.top) / rect.height - 0.5;
          rx(-py * max);
          ry(px * max);
          gsap.to(sheen, {
            autoAlpha: 1,
            backgroundPosition: `${50 + px * 60}% ${50 + py * 60}%`,
            duration: 0.6,
            overwrite: "auto",
          });
        });
        const onLeave = contextSafe(() => {
          rx(0);
          ry(0);
          gsap.to(sheen, { autoAlpha: 0, duration: 0.6 });
        });

        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        return () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        };
      });

      return () => mm.revert();
    },
    { scope: ref, dependencies: [max] },
  );

  return (
    <div ref={ref} className={cn("relative will-change-transform", className)}>
      {children}
      <div
        ref={sheenRef}
        aria-hidden
        className="pointer-events-none invisible absolute inset-0 z-[2] bg-[radial-gradient(circle_at_center,rgb(255_255_255/0.28),transparent_55%)] bg-[length:200%_200%] opacity-0 mix-blend-soft-light"
      />
    </div>
  );
}
