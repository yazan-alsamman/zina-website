# Zina Al Mokri: website

Next.js 16 (App Router, Cache Components) · React 19 · Tailwind CSS v4 · next-intl (EN / AR-RTL) ·
React Three Fiber · GSAP + Lenis · Prisma 7 + PostgreSQL.

## Getting started

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # then adjust values
docker compose up -d        # local PostgreSQL 16 (set POSTGRES_PORT in .env if 5432 is taken)
npm run db:migrate          # apply migrations
npm run dev                 # http://localhost:3000 → redirects to /en
```

## Scripts

| Script                    | What it does                                  |
| ------------------------- | --------------------------------------------- |
| `dev` / `build` / `start` | Next.js                                       |
| `lint`                    | ESLint                                        |
| `typecheck`               | `next typegen` (route types) + `tsc --noEmit` |
| `format` / `format:check` | Prettier (+ Tailwind class sorting)           |
| `db:migrate`              | `prisma migrate dev`                          |
| `db:generate`             | `prisma generate` (client → `src/generated/`) |
| `db:studio`               | Prisma Studio                                 |

## Structure

- `src/app/[locale]/`: localized site (root layout sets `<html lang dir>`).
- `src/app/admin/`: separate, non-localized root layout.
- `src/i18n/`: routing, request config, typed navigation. Messages live in `src/messages/`.
- `src/proxy.ts`: next-intl locale routing (Next 16 "proxy", formerly middleware).
- `src/lib/gsap.ts`: GSAP plugins registered once, client-side. `src/components/motion/SmoothScroll.tsx`: Lenis on GSAP's ticker.
- `src/components/three/Scene.tsx`: client-only R3F canvas (`next/dynamic`, `ssr: false`).
- `prisma/schema.prisma`: data model. `prisma.config.ts` holds the connection URL.
- `docs/design-tokens.md`: colours, contrast ratios, type, spacing, motion.

Original photos go in `assets/raw-photos/` (git-ignored, never committed).
