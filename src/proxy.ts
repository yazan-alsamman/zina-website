import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals, the non-localized admin area and files with an extension.
  matcher: "/((?!api|trpc|_next|_vercel|admin|.*\..*).*)",
};
