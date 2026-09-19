import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button, Panel, StatusPill } from "@/components/ui";

export default async function AdminQuestionsPage() {
  const supabase = await createClient();
  const { data: questions } = await supabase
    .from("questions")
    .select("id, type, prompt, default_marks, default_time_seconds")
    .order("created_at", { ascending: false });

  return (
    <div className="px-8 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-xl font-semibold mb-1">Questions</h1>
          <p className="text-sm text-ink-muted">
            The shared question bank. Attach questions to a test from the test page.
          </p>
        </div>
        <Link href="/admin/questions/new">
          <Button>New question</Button>
        </Link>
      </div>

      <Panel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-ink-muted">
              <th className="px-5 py-3 font-medium">Question</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Default marks</th>
              <th className="px-5 py-3 font-medium">Default timer</th>
            </tr>
          </thead>
          <tbody>
            {!questions || questions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-ink-muted">
                  No questions yet.
                </td>
              </tr>
            ) : (
              questions.map((q) => (
                <tr key={q.id} className="border-b border-hairline last:border-0">
                  <td className="px-5 py-3 max-w-md">
                    <Link href={`/admin/questions/${q.id}`} className="text-teal hover:underline">
                      {q.prompt.length > 90 ? `${q.prompt.slice(0, 90)}…` : q.prompt}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill>{q.type === "mcq" ? "MCQ" : "Short answer"}</StatusPill>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{q.default_marks}</td>
                  <td className="px-5 py-3 text-ink-muted">{q.default_time_seconds}s</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
