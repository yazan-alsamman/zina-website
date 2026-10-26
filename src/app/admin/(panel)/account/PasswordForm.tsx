"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/admin/auth-actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { errorProps, Field, FormMessage, inputClass, Panel } from "@/components/admin/ui";
import { MIN_PASSWORD_LENGTH } from "@/lib/admin/constants";
import type { ActionState } from "@/lib/admin/schemas";

export function PasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(changePasswordAction, {});

  return (
    <Panel className="max-w-xl">
      <form action={action} className="flex flex-col gap-6" noValidate>
        <FormMessage state={state} />
        <Field label="Current password" htmlFor="current" errors={state.errors?.current}>
          <input
            id="current"
            name="current"
            type="password"
            autoComplete="current-password"
            className={inputClass}
            {...errorProps("current", state.errors?.current)}
          />
        </Field>
        <Field
          label="New password"
          htmlFor="next"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters. A short sentence works well.`}
          errors={state.errors?.next}
        >
          <input
            id="next"
            name="next"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            {...errorProps("next", state.errors?.next)}
          />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm" errors={state.errors?.confirm}>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            {...errorProps("confirm", state.errors?.confirm)}
          />
        </Field>
        <div>
          <SubmitButton>Change password</SubmitButton>
        </div>
      </form>
    </Panel>
  );
}
