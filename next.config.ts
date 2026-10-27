import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Self-contained server bundle (.next/standalone) for the VPS; deploy/scripts/bundle.sh adds
  // public/ and .next/static next to it.
  output: "standalone",
  outputFileTracingIncludes: {
    // Read at request time by the share image route (src/app/[locale]/opengraph-image.tsx).
    "/*": ["src/assets/fonts/**/*"],
  },
  // Routes that read files under process.cwd() (share images, media) make the tracer include the
  // whole project. Only the fonts above are read at runtime; public/ is copied by bundle.sh and
  // uploads live in shared storage on the server, never in a release.
  outputFileTracingExcludes: {
    "/*": [
      "storage/**",
      "assets/**",
      "docs/**",
      "tests/**",
      "scripts/**",
      "deploy/**",
      "prisma/**",
      "public/**",
      ".claude/**",
      "src/{app,components,config,generated,i18n,lib,messages}/**",
      "*.{md,json,yml,ts,mts,mjs,cjs,tsbuildinfo}",
    ],
  },
  // Nginx compresses (gzip/brotli) and the version banner stays private.
  compress: false,
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  // Native / jsdom-based server packages are loaded from node_modules, not bundled.
  serverExternalPackages: [
    "sharp",
    "@node-rs/argon2",
    "isomorphic-dompurify",
    "jsdom",
    "nodemailer",
  ],
  env: {
    // Base URL for uploaded media (Nginx in production, the /media route handler otherwise).
    PUBLIC_MEDIA_URL: process.env.PUBLIC_MEDIA_URL ?? "/media",
  },
  experimental: {
    // `[locale]` and `admin` are separate root layouts, so unmatched URLs
    // need a document-level 404 (see src/app/global-not-found.tsx).
    globalNotFound: true,
    // Image uploads pass through the proxy (admin guard); allow 15 MB files plus form overhead.
    proxyClientMaxBodySize: "16mb",
  },
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/admin",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
