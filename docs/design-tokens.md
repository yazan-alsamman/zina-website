# Design tokens: "Quiet Luxury"

Source of truth: [`src/app/globals.css`](../src/app/globals.css) (`@theme` block). Every token is
a CSS variable and a Tailwind utility (`bg-sand`, `text-mocha`, `ease-luxe`, `text-h1`, …).
Tailwind's default palette is reset, so only brand colours exist.

## Colours

### Core palette (from the owner's original site; keep exactly)

| Token           | Hex       | Role                                                                 |
| --------------- | --------- | -------------------------------------------------------------------- |
| `--color-white` | `#FFFFFF` | Primary background                                                   |
| `--color-mist`  | `#EAEAEA` | Secondary surfaces, dividers, admin background                       |
| `--color-sand`  | `#B8A48F` | Surfaces and accents only. **Never body text on a light background** |
| `--color-mocha` | `#4A3F35` | Body text; background of dark sections                               |
| `--color-ink`   | `#000000` | Fine details only (hairlines, tiny marks)                            |

### Derived tints and shades

Mixed in sRGB from the core colours (percentages give the share of the second colour).

| Token               | Hex       | Derivation         | Intended use                                               |
| ------------------- | --------- | ------------------ | ---------------------------------------------------------- |
| `--color-sand-100`  | `#F1EDE9` | sand + 80 % white  | Soft section backgrounds, selected rows                    |
| `--color-sand-200`  | `#DCD2C7` | sand + 50 % white  | Borders, text selection, hover surfaces                    |
| `--color-sand-700`  | `#7C6C5E` | sand + 55 % mocha  | **Sand-toned text that passes AA** (eyebrows, meta, links) |
| `--color-mocha-300` | `#AEA9A4` | mocha + 55 % white | Disabled states, subtle text on dark sections              |
| `--color-mocha-800` | `#342C25` | mocha + 30 % black | Dark section background (deeper than mocha)                |
| `--color-mocha-900` | `#211C18` | mocha + 55 % black | Footer / darkest surfaces                                  |

### Contrast ratios (WCAG 2.x)

AA requires **4.5:1** for normal text and **3:1** for large text (≥ 24px, or ≥ 18.66px bold) and UI
components. ✅ = AA normal text, ◐ = large text / UI only, ✗ = fails.

| Text ↓ / Background → | white    | mist     | sand-100 | sand-200 | sand    | mocha    | mocha-800 | mocha-900 |
| --------------------- | -------- | -------- | -------- | -------- | ------- | -------- | --------- | --------- |
| **mocha**             | 10.23 ✅ | 8.50 ✅  | 8.78 ✅  | 6.86 ✅  | 4.26 ◐  | n/a      | 1.34 ✗    | 1.65 ✗    |
| **mocha-800**         | 13.70 ✅ | 11.39 ✅ | 11.76 ✅ | 9.19 ✅  | 5.70 ✅ | 1.34 ✗   | n/a       | 1.23 ✗    |
| **mocha-900**         | 16.88 ✅ | 14.03 ✅ | 14.49 ✅ | 11.32 ✅ | 7.03 ✅ | 1.65 ✗   | 1.23 ✗    | n/a       |
| **sand-700**          | 5.04 ✅  | 4.19 ◐   | 4.33 ◐   | 3.38 ◐   | 2.10 ✗  | 2.03 ✗   | 2.72 ✗    | 3.35 ◐    |
| **mocha-300**         | 2.33 ✗   | 1.94 ✗   | 2.00 ✗   | 1.56 ✗   | 1.03 ✗  | 4.39 ◐   | 5.88 ✅   | 7.24 ✅   |
| **sand**              | 2.40 ✗   | 2.00 ✗   | 2.06 ✗   | 1.61 ✗   | n/a     | 4.26 ◐   | 5.70 ✅   | 7.03 ✅   |
| **ink**               | 21.00 ✅ | 17.46 ✅ | 18.03 ✅ | 14.09 ✅ | 8.74 ✅ | 2.05 ✗   | 1.53 ✗    | 1.24 ✗    |
| **white**             | n/a      | 1.20 ✗   | 1.16 ✗   | 1.49 ✗   | 2.40 ✗  | 10.23 ✅ | 13.70 ✅  | 16.88 ✅  |
| **mist**              | 1.20 ✗   | n/a      | 1.03 ✗   | 1.24 ✗   | 2.00 ✗  | 8.50 ✅  | 11.39 ✅  | 14.03 ✅  |
| **sand-100**          | 1.16 ✗   | 1.03 ✗   | n/a      | 1.28 ✗   | 2.06 ✗  | 8.78 ✅  | 11.76 ✅  | 14.49 ✅  |

**Rules that follow from the table**

- Body text: `mocha` on `white` / `mist` / `sand-100` / `sand-200`. On dark sections use `white`,
  `mist` or `sand-100` on `mocha` or darker.
- `sand` is never text on light backgrounds (2.40:1 on white). Use `sand-700` (5.04:1 on white)
  when text should look sand-toned. Note that `sand-700` is AA only on pure white.
- `sand` _as text_ only works on `mocha-800` / `mocha-900` (≥ 5.7:1), e.g. accents in dark sections.
- `mocha` on a `sand` surface is 4.26:1: large text or UI only, not body copy.

## Typography

Fonts load through `next/font/google` ([`src/lib/fonts.ts`](../src/lib/fonts.ts)) and switch
per locale via `:root:lang(ar)`:

| Role    | English            | Arabic                                      |
| ------- | ------------------ | ------------------------------------------- |
| Display | Cormorant Garamond | Noto Naskh Arabic → falls back to Cormorant |
| Body    | Jost               | IBM Plex Sans Arabic → falls back to Jost   |

Utilities: `font-display`, `font-sans` (locale-aware), `font-latin-display` (always Cormorant,
for the Latin wordmark). The Arabic faces load only their Arabic subset and are not preloaded,
so English pages don't download them. Arabic body line-height is raised to 1.85.

Fluid scale (390px → 1440px viewport):

| Token          | Size                                                                  | Line height        |
| -------------- | --------------------------------------------------------------------- | ------------------ |
| `text-caption` | 0.75rem (letter-spacing 0.08em)                                       | 1.5                |
| `text-body`    | 1rem → 1.125rem                                                       | 1.7                |
| `text-lead`    | 1.125rem → 1.375rem                                                   | 1.6                |
| `text-h3`      | 1.5rem → 2rem                                                         | 1.25               |
| `text-h2`      | 2rem → 3rem                                                           | 1.15               |
| `text-h1`      | 2.75rem → 4.75rem                                                     | 1.05               |
| `text-display` | 3.5rem → 7.5rem (tracking -0.01em)                                    | 0.95               |
| `text-hero`    | 4.75rem → 12rem (tracking -0.02em; Arabic: 4rem → 11rem, no tracking) | 0.84 (Arabic 1.12) |

## Spacing and layout

- Tailwind base unit `--spacing: 0.25rem` (so `p-4` = 1rem).
- `--spacing-gutter`: 1rem → 2.5rem (page side padding, `px-gutter`).
- `--spacing-section`: 4rem → 9rem (vertical section rhythm, `py-section`).
- `--container-content: 72rem` (`max-w-content`), `--container-prose: 38rem` (`max-w-prose`).

## Motion

| Token           | Curve                            | Use                                   |
| --------------- | -------------------------------- | ------------------------------------- |
| `--ease-luxe`   | `cubic-bezier(0.22, 1, 0.36, 1)` | Default: reveals, hovers, page motion |
| `--ease-silk`   | `cubic-bezier(0.65, 0, 0.35, 1)` | Symmetric in-out (loops, crossfades)  |
| `--ease-settle` | `cubic-bezier(0.16, 1, 0.3, 1)`  | Long, soft landings (large elements)  |

Durations: `--duration-fast` 200ms, `--duration-base` 500ms, `--duration-slow` 900ms.

The same curves are registered in GSAP as `"luxe"`, `"silk"` and `"settle"` (CustomEase, in
[`src/lib/gsap.ts`](../src/lib/gsap.ts)); GSAP defaults to `ease: "luxe", duration: 0.9`.

### Reduced motion

- CSS: under `prefers-reduced-motion: reduce`, animations and transitions are cut to ~0ms and
  smooth scrolling is disabled.
- Lenis is not created at all (native scrolling).
- R3F: the canvas switches to `frameloop="demand"` and `Float` is frozen.
- GSAP: branch timelines with `gsap.matchMedia()` using `motionQueries` from `src/lib/gsap.ts`.
