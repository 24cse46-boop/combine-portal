import Link from "next/link";
import { candidateLogin } from "@/lib/actions/auth";
import { LoginForm } from "@/components/login-form";
import { Panel } from "@/components/ui";

export default function CandidateLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs tracking-wide text-ink-muted">Combine Foundation</p>
          <h1 className="font-display text-2xl font-semibold text-ink mt-1">
            Volunteer Assessment Portal
          </h1>
        </div>
        <Panel className="p-8">
          <h2 className="text-sm font-medium text-ink mb-6">Candidate sign in</h2>
          <LoginForm action={candidateLogin} submitLabel="Sign in" />
        </Panel>
        <p className="mt-6 text-center text-xs text-ink-muted">
          Combine Foundation staff?{" "}
          <Link href="/admin/login" className="text-teal hover:underline">
            Admin sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
