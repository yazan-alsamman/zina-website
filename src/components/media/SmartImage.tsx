import { cn } from "@/lib/cn";
import { mediaUrl } from "@/lib/media/url";
import type { SmartAsset } from "@/lib/shop/types";

export type { SmartAsset };

type SmartImageProps = {
  asset: SmartAsset;
  alt: string;
  /** Layout width hint for the browser, e.g. "(min-width: 768px) 40vw, 90vw". */
  sizes?: string;
  className?: string;
  priority?: boolean;
};

/**
 * <picture> with AVIF and WebP srcsets from our own media pipeline, intrinsic dimensions (no
 * layout shift) and the stored LQIP as a blurred placeholder behind the loading image.
 */
export function SmartImage({ asset, alt, sizes = "100vw", className, priority }: SmartImageProps) {
  const widths = [...asset.widths].sort((a, b) => a - b);
  const srcSet = (format: "avif" | "webp") =>
    widths.map((w) => `${mediaUrl(`${asset.dir}/w${w}.${format}`)} ${w}w`).join(", ");
  const fallback = mediaUrl(`${asset.dir}/w${widths[Math.min(1, widths.length - 1)]}.webp`);

  return (
    <picture>
      <source type="image/avif" srcSet={srcSet("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet("webp")} sizes={sizes} />
      {/* A plain <img> inside <picture>: we ship our own responsive pipeline. */}
      <img
        src={fallback}
        alt={alt}
        width={asset.width}
        height={asset.height}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className={cn("h-auto w-full bg-cover bg-center", className)}
        style={{ backgroundImage: `url("${asset.lqip}")` }}
      />
    </picture>
  );
}
