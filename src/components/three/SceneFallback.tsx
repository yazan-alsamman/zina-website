import { cn } from "@/lib/cn";

/** Static stand-in shown while the canvas loads, or permanently when WebGL is unavailable. */
export function SceneFallback({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none grid place-items-center", className)}>
      <div className="aspect-square w-[min(56vw,22rem)] rounded-full bg-[radial-gradient(circle_at_35%_30%,var(--color-sand-100),var(--color-sand)_45%,var(--color-sand-700)_100%)] opacity-90 blur-[0.5px]" />
    </div>
  );
}
