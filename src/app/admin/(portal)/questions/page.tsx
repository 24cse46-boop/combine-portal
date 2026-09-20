import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { generateQuestionsWithAI } from "@/lib/actions/ai-questions";
import { Button, ErrorNote, Field, Panel, Select, StatusPill, TextInput } from "@/components/ui";

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ ai_error?: string; ai_created?: string }>;
}) {
  const { ai_error, ai_created } = await searchParams;
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

      <ErrorNote message={ai_error} />
      {ai_created ? (
        <p className="border border-success bg-success-bg px-4 py-2.5 text-sm text-success mb-6">
          {ai_created} question(s) generated and added to the bank below — review them before
          using them on a live test.
        </p>
      ) : null}

      <section className="mb-8">
        <h2 className="text-sm font-medium mb-4">Generate with AI</h2>
        <Panel className="p-6">
          <form action={generateQuestionsWithAI} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Topic / instructions" htmlFor="topic">
                <TextInput
                  id="topic"
                  name="topic"
                  placeholder="e.g. teamwork and conflict resolution for volunteer coordinators"
                  required
                />
              </Field>
            </div>
            <Field label="How many" htmlFor="count">
              <TextInput id="count" name="count" type="number" min={1} max={20} defaultValue={5} />
            </Field>
            <Field label="Type" htmlFor="type">
              <Select id="type" name="type" defaultValue="mcq">
                <option value="mcq">Multiple choice</option>
                <option value="short_answer">Short answer</option>
                <option value="mixed">Mixed</option>
              </Select>
            </Field>
            <Field label="Difficulty" htmlFor="difficulty">
              <Select id="difficulty" name="difficulty" defaultValue="medium">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>
            </Field>
            <div className="flex items-end">
              <Button type="submit">Generate</Button>
            </div>
          </form>
        </Panel>
      </section>

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
