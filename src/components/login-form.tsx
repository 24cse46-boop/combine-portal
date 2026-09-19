"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/lib/actions/auth";
import { Button, Field, TextInput } from "@/components/ui";

export function LoginForm({
  action,
  submitLabel,
}: {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(action, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label="Email" htmlFor="email">
        <TextInput id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password">
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : submitLabel}
      </Button>
    </form>
  );
}
