import Link from "next/link";
import { Button, Panel } from "@/components/ui";

export default function SubmittedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <Panel className="max-w-lg w-full p-8 text-center">
        <h1 className="font-display text-xl font-semibold mb-3">
          Test submitted successfully
        </h1>
        <p className="text-sm text-ink-muted mb-6">
          Your assessment has been successfully submitted. Your responses will be
          reviewed by the Combine Foundation team. Further updates will be
          communicated through your registered email.
        </p>
        <Link href="/dashboard">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </Panel>
    </main>
  );
}
