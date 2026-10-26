import Image from "next/image";
import type { MediaSlot } from "@/config/media";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

type MediaFrameProps = {
  slot: MediaSlot;
  locale: Locale;
  className?: string;
  sizes?: string;
  /** Faint serif initial shown on placeholders so empty frames still feel composed. */
  monogram?: string;
  priority?: boolean;
};

/** A photo at a fixed aspect ratio, or an elegant tonal placeholder until the photo exists. */
export function MediaFrame({
  slot,
  locale,
  className,
  sizes = "(min-width: 768px) 33vw, 80vw",
  monogram,
  priority,
}: MediaFrameProps) {
  const alt = slot.alt[locale];

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        !slot.src && "grain",
        !slot.src && `media-${slot.tone}`,
        className,
      )}
      style={{ aspectRatio: slot.aspect }}
    >
      {slot.src ? (
        <Image
          src={slot.src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div role="img" aria-label={alt} className="absolute inset-0 grid place-items-center">
          {monogram ? (
            <span
              aria-hidden
              className={cn(
                "font-latin-display text-[min(40vw,14rem)] leading-none select-none",
                slot.tone === "mocha" ? "text-sand/25" : "text-white/35",
              )}
            >
              {monogram}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
