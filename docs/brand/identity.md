# Maison: the applied identity

Concept 1 from `public/brand/concepts/1/` is the official logo: a Didone Ƶ with a sand
cross-stroke under an arch (a boutique doorway and a hand mirror), with the name in tracked
Cormorant capitals or in Noto Naskh Arabic. Concepts 2 and 3 stay in `public/brand/concepts/` for
reference (see `/admin/brand`).

Regenerate everything after changing the drawing or the type:

```bash
node scripts/brand/build-logos.mjs      # the three concepts (review board)
node scripts/brand/build-identity.mjs   # the files below
```

| File                                                        | Use                                                         |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| `public/brand/logo.svg`, `logo-arabic.svg`                  | Stacked lockups, mocha ink and sand accent                  |
| `public/brand/logo-night.svg`, `logo-arabic-night.svg`      | Reversed, for mocha or photographic grounds                 |
| `public/brand/logo-horizontal*.svg`                         | Mark beside the name (headers, documents)                   |
| `public/brand/logo-mono.svg`, `mark.svg`                    | Single colour (currentColor), and the mark alone            |
| `public/brand/email-logo.png`                               | Order email header (email clients do not render SVG)        |
| `src/app/icon.svg`, `icon1.png`, `icon2.png`, `favicon.ico` | Favicons: the small Ƶ on a mocha tile (SVG, 32, 16)         |
| `src/app/apple-icon.png`, `public/icons/*.png`              | Home screen (180) and manifest icons (192, 512, maskable)   |
| `src/components/brand/maison.generated.ts`                  | Path data for `<Logo />` (header, footer, preloader, admin) |

On the site the logo is drawn by `src/components/brand/Logo.tsx`, which follows the text colour
(`--logo-ink`) and takes the cross-stroke colour from `--logo-accent`: sand on light grounds,
sand-200 on mocha. Arabic pages use the Arabic lockups. Share images: English is rendered by
`src/app/[locale]/opengraph-image.tsx` from `logo-night.svg`; Arabic is `public/og/ar.png`, from
`scripts/og/ar.html`.
