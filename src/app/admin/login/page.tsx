import Link from "next/link";
import { adminLogin } from "@/lib/actions/auth";
import { LoginForm } from "@/components/login-form";
import { Panel } from "@/components/ui";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16 bg-teal-dark">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs tracking-wide text-paper/70">Combine Foundation</p>
          <h1 className="font-display text-2xl font-semibold text-paper mt-1">
            Admin Console
          </h1>
        </div>
        <Panel className="p-8">
          <h2 className="text-sm font-medium text-ink mb-6">Authorized staff sign in</h2>
          <LoginForm action={adminLogin} submitLabel="Sign in" />
        </Panel>
        <p className="mt-6 text-center text-xs text-paper/60">
          Candidate?{" "}
          <Link href="/login" className="text-paper hover:underline">
            Go to candidate sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
