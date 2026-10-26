import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/admin/auth-actions";
import { Wordmark } from "@/components/brand/Wordmark";
import type { AdminSession } from "@/lib/auth/session";
import { AdminNav } from "./AdminNav";

/**
 * The atelier: a mocha "night" rail on the left (the same night as the landing page) and a
 * calm mist "day" workspace.
 */
export function AdminShell({ admin, children }: { admin: AdminSession; children: ReactNode }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="flex flex-col gap-8 bg-mocha px-6 py-6 text-sand-100 md:sticky md:top-0 md:h-dvh md:py-10">
        <div className="flex items-center justify-between md:block">
          <Link href="/admin" className="block text-sand-100">
            <Wordmark className="text-[0.8rem]" />
          </Link>
          <p className="label mt-0 text-sand md:mt-3">Atelier</p>
        </div>

        <AdminNav />

        <div className="mt-auto hidden flex-col gap-4 border-t border-white/10 pt-6 text-sm md:flex">
          <p className="truncate text-sand-200" title={admin.email}>
            {admin.name}
          </p>
          <Link href="/admin/account" className="text-sand-200 transition-colors hover:text-white">
            Change password
          </Link>
          <Link
            href="/en"
            target="_blank"
            className="text-sand-200 transition-colors hover:text-white"
          >
            View the site
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="text-sand-200 transition-colors hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main id="admin-main" className="px-5 py-8 md:px-12 md:py-12">
        <div className="mx-auto max-w-6xl">{children}</div>
        <div className="mt-16 flex gap-6 border-t border-sand-200 pt-6 text-sm md:hidden">
          <Link href="/admin/account" className="text-sand-700">
            Change password
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="text-sand-700">
              Sign out
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
