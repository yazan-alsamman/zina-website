import type { MetadataRoute } from "next";

/** Home screen install: Maison icons from scripts/brand/build-identity.mjs. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zina Al Mokri",
    short_name: "Zina Al Mokri",
    description: "Honest reviews of the world's finest beauty.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4a3f35",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
