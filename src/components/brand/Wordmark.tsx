import { cn } from "@/lib/cn";

/**
 * Temporary typographic logo until the brand mark exists. Swap the contents of this component
 * for an SVG logo later; every usage (header, preloader, footer) updates at once.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      lang="en"
      dir="ltr"
      className={cn(
        // Negative end margin cancels the trailing letter-space so the mark stays optically centred.
        "me-[-0.34em] inline-block font-latin-display leading-none font-normal tracking-[0.34em] whitespace-nowrap uppercase",
        className,
      )}
    >
      Zina Al Mokri
    </span>
  );
}
