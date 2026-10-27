import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Native / jsdom-based server packages are loaded from node_modules, not bundled.
  serverExternalPackages: ["sharp", "@node-rs/argon2", "isomorphic-dompurify", "jsdom", "nodemailer"],
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
