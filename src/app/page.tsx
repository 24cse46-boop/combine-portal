import Link from "next/link";
import { Button } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-xs tracking-wide text-ink-muted mb-2">Combine Foundation</p>
      <h1 className="font-display text-3xl font-semibold mb-4 max-w-lg">
        Volunteer Assessment Portal
      </h1>
      <p className="text-sm text-ink-muted max-w-sm mb-8">
        A secure, scheduled, timed assessment experience for Combine Foundation
        volunteer applicants.
      </p>
      <div className="flex gap-3">
        <Link href="/login">
          <Button>Candidate sign in</Button>
        </Link>
        <Link href="/admin/login">
          <Button variant="secondary">Admin sign in</Button>
        </Link>
      </div>
    </main>
  );
}
