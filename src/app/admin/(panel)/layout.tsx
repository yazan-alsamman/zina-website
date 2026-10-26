import type { ReactNode } from "react";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth/session";

/**
 * Every panel page renders behind a server-side session check (the proxy is only the first
 * gate). Session and data reads are per-request, so the whole panel streams inside Suspense.
 */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <AuthedPanel>{children}</AuthedPanel>
    </Suspense>
  );
}

async function AuthedPanel({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return <AdminShell admin={admin}>{children}</AdminShell>;
}

function PanelSkeleton() {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]" aria-busy>
      <div className="hidden bg-mocha md:block" />
      <div className="p-12">
        <div className="h-10 w-64 animate-pulse bg-sand-100" />
      </div>
    </div>
  );
}
