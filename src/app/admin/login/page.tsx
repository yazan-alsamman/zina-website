import type { Metadata } from "next";
import { Suspense } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh md:grid-cols-2">
      {/* Night half: the house's atmosphere, purely decorative */}
      <div
        aria-hidden
        className="stage-backdrop relative hidden items-end p-12 text-sand-100 md:flex"
      >
        <p className="max-w-[24ch] font-latin-display text-h2 font-light">
          Every product, reviewed with care.
        </p>
      </div>

      <div className="flex flex-col justify-center bg-white px-6 py-16 md:px-20">
        <div className="w-full max-w-sm">
          <Wordmark className="text-[0.85rem] text-mocha" />
          <h1 className="mt-10 font-latin-display text-h2 font-light text-mocha">
            Atelier sign in
          </h1>
          <p className="mt-2 text-sm text-sand-700">For Zina&rsquo;s team only.</p>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
