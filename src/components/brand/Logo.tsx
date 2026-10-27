import { cn } from "@/lib/cn";
import { MAISON } from "./maison.generated";

const NAME = { latin: "Zina Al Mokri", arabic: "زينة المقري" } as const;

type Placement = { x: number; y: number; scale: number };
const at = ({ x, y, scale }: Placement) =>
  `translate(${x} ${y})${scale === 1 ? "" : ` scale(${scale})`}`;

/**
 * The Maison identity (scripts/brand/build-identity.mjs): the arch, the Didone Ƶ with its sand
 * cross-stroke, and the name in Latin or Arabic, drawn as outlines (no web font needed).
 *
 * Colours follow the surrounding text: ink is `--logo-ink` (default currentColor) and the
 * cross-stroke `--logo-accent` (default sand). On mocha grounds set the accent to sand-200.
 * Size it with a height (or width) class; the other side follows the aspect ratio.
 *
 * The parts carry `data-logo` hooks (arch, z, cross, word, glyph) for the preloader animation;
 * pass `clipId` to mask the word so its glyphs can rise into place.
 */
export function Logo({
  layout = "horizontal",
  script = "latin",
  className,
  decorative = false,
  clipId,
}: {
  layout?: "horizontal" | "stacked";
  script?: "latin" | "arabic";
  className?: string;
  /** Hide from assistive technology when a link or heading already names the site. */
  decorative?: boolean;
  clipId?: string;
}) {
  const key =
    script === "arabic" ? (layout === "stacked" ? "stackedArabic" : "horizontalArabic") : layout;
  const lockup = MAISON.layouts[key];
  const word = MAISON[script];
  // Small horizontal lockups keep a crisp 1 px arch at every header size.
  const hairline = layout === "horizontal";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${lockup.width} ${lockup.height}`}
      className={cn("block w-auto shrink-0 overflow-visible", className)}
      {...(decorative
        ? { "aria-hidden": true, focusable: false }
        : { role: "img", "aria-label": NAME[script] })}
    >
      <g transform={at(lockup.mark)}>
        <path
          data-logo="arch"
          d={MAISON.mark.arch}
          pathLength={1}
          fill="none"
          stroke="var(--logo-ink, currentColor)"
          strokeWidth={hairline ? 1 : lockup.archWidth}
          strokeLinecap="round"
          vectorEffect={hairline ? "non-scaling-stroke" : undefined}
        />
        <path data-logo="z" d={MAISON.mark.z} fill="var(--logo-ink, currentColor)" />
        <path
          data-logo="cross"
          d={MAISON.mark.cross}
          fill="var(--logo-accent, var(--color-sand))"
        />
      </g>
      {clipId && (
        <clipPath id={clipId}>
          <rect
            x={lockup.word.x - 4}
            y={lockup.word.y - 4}
            width={word.width * lockup.word.scale + 8}
            height={word.height * lockup.word.scale + 8}
          />
        </clipPath>
      )}
      <g clipPath={clipId ? `url(#${clipId})` : undefined}>
        <g data-logo="word" transform={at(lockup.word)} fill="var(--logo-ink, currentColor)">
          {word.glyphs.map((d, i) => (
            <path key={i} data-logo="glyph" d={d} />
          ))}
        </g>
      </g>
    </svg>
  );
}
