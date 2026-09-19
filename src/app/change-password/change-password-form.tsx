"use client";

import { useActionState } from "react";
import { changePassword } from "@/lib/actions/auth";
import { Button, Field, TextInput } from "@/components/ui";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label="New password" htmlFor="newPassword" hint="At least 8 characters.">
        <TextInput
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword">
        <TextInput
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
