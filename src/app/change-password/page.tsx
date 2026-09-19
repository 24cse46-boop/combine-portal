import { Panel } from "@/components/ui";
import { ChangePasswordForm } from "./change-password-form";

export default function ChangePasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold text-ink mb-2">
          Set a new password
        </h1>
        <p className="text-sm text-ink-muted mb-8">
          You&apos;re signing in with a temporary password. Choose a new one to continue.
        </p>
        <Panel className="p-8">
          <ChangePasswordForm />
        </Panel>
      </div>
    </main>
  );
}
