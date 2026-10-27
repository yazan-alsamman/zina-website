/** Public origin of the site (NEXT_PUBLIC_SITE_URL), without a trailing slash. */
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  return `${siteOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** The customer's private tracking page. */
export function trackingPath(locale: string, orderNumber: string, token: string): string {
  return `/${locale}/order/${encodeURIComponent(orderNumber)}?t=${encodeURIComponent(token)}`;
}
