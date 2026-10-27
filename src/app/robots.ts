import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Admin, private order pages and the bag/checkout flow are never indexed.
        disallow: ["/admin", "/admin/", "/*/order/", "/*/checkout", "/*/cart"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
