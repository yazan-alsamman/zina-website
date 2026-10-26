import type { ReactNode } from "react";

export function PlaceholderPage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main id="main" className="mx-auto w-full max-w-content flex-1 px-gutter py-section">
      <h1 className="text-h1 text-mocha">{title}</h1>
      {children ? <div className="mt-6 max-w-prose text-lead text-mocha">{children}</div> : null}
    </main>
  );
}
