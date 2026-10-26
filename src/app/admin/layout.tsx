import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · Zina Al Mokri" },
  robots: { index: false, follow: false },
};

// Separate root layout: the admin area is English-only and not localized.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en" dir="ltr" className={fontVariables}>
      <body className="min-h-dvh bg-mist">{children}</body>
    </html>
  );
}
