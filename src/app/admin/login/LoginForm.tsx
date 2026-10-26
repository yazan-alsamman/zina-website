"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { errorProps, Field, FormMessage, inputClass } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/schemas";
import { loginAction } from "../auth-actions";

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "/admin";
  const [state, action] = useActionState<ActionState, FormData>(loginAction, {});

  return (
    <form action={action} className="mt-10 flex flex-col gap-6" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <Field label="Email" htmlFor="email" errors={state.errors?.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={state.values?.email}
          required
          className={inputClass}
          {...errorProps("email", state.errors?.email)}
        />
      </Field>
      <Field label="Password" htmlFor="password" errors={state.errors?.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
          {...errorProps("password", state.errors?.password)}
        />
      </Field>
      <SubmitButton pendingLabel="Signing in…" className="mt-2 w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
