import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Page not found · Zina Al Mokri",
};

// Rendered for URLs that match no route at all (outside `[locale]` and `admin`).
export default function GlobalNotFound() {
  return (
    <html lang="en" dir="ltr" className={fontVariables}>
      <body className="grid min-h-dvh place-items-center px-gutter text-center">
        <main>
          <p className="text-caption tracking-[0.24em] text-sand-700 uppercase">404</p>
          <h1 className="mt-4 text-h1 text-mocha">Page not found</h1>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- no router outside root layouts */}
          <a
            href="/en"
            className="mt-10 inline-block border-b border-sand pb-1 text-caption tracking-[0.08em] uppercase"
          >
            Back to home
          </a>
        </main>
      </body>
    </html>
  );
}
