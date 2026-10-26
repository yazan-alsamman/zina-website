import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth/token";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

/**
 * - /admin/*: first line of defence. Requests without a validly signed session are sent to the
 *   login page before anything renders. Pages, server actions and route handlers re-check the
 *   session against the database themselves (src/lib/auth/session.ts).
 * - everything else: next-intl locale routing.
 */
export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const response = await guardAdmin(request, pathname, search);
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  return intl(request);
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
