import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth/token";
import { isPublishedSlug, orderLinkIsValid } from "./lib/proxy-checks";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

/**
 * - /admin/*: first line of defence. Requests without a validly signed session are sent to the
 *   login page before anything renders. Pages, server actions and route handlers re-check the
 *   session against the database themselves (src/lib/auth/session.ts).
 * - product pages and private order pages: unknown products and wrong order links get a real
 *   404 status before anything streams (see src/lib/proxy-checks.ts).
 * - everything else: next-intl locale routing.
 */
export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const response = await guardAdmin(request, pathname, search);
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  const missing = await missingResource(request);
  if (missing) return missing;

  return intl(request);
}

const PRODUCT_PATH = /^\/(en|ar)\/products\/([^/]+)\/?$/;
const ORDER_PATH = /^\/(en|ar)\/order\/([^/]+)\/?$/;

/** A 404 response showing the localized not-found page (rendered by the catch-all route). */
async function missingResource(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  let locale: string | null = null;
  let found: boolean | null = true;

  const product = PRODUCT_PATH.exec(pathname);
  const order = ORDER_PATH.exec(pathname);
  if (product) {
    locale = product[1];
    found = await isPublishedSlug(decodeURIComponent(product[2]));
  } else if (order) {
    locale = order[1];
    found = await orderLinkIsValid(decodeURIComponent(order[2]), searchParams.get("t"));
  }
  if (found !== false || !locale) return null;

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}/not-found`;
  url.search = "";
  const response = NextResponse.rewrite(url, { status: 404 });
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}

async function guardAdmin(request: NextRequest, pathname: string, search: string) {
  const isLogin = pathname === "/admin/login";
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session && !isLogin) {
    if (pathname.startsWith("/admin/api/")) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    if (request.method === "GET") url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // Note: the login page is never redirected away from here. The proxy only checks the
  // signature; a signed but revoked token (password changed) must still reach the login page,
  // otherwise proxy and the server-side session check would bounce the visitor in a loop.
  return NextResponse.next();
}

export const config = {
  // Skip API routes, Next internals, uploaded media and files with an extension.
  matcher: "/((?!api|trpc|_next|_vercel|media|.*\\..*).*)",
};
