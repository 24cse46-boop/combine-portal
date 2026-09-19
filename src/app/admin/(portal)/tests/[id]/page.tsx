// Joined Supabase selects (question:questions(...)) don't have a generated
// row type in this project yet, so the spots that read the joined shape
// stay loosely typed rather than hand-rolling a partial schema type.
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateTestConfig, updateTestStatus } from "@/lib/actions/tests";
import { addQuestionToTest, removeQuestionFromTest } from "@/lib/actions/test-questions";
import { TestConfigFields } from "@/components/test-config-fields";
import { Button, ErrorNote, Panel, Select, StatusPill, TextInput } from "@/components/ui";

const NEXT_STEPS: Record<string, { to: string; label: string; variant?: "primary" | "secondary" }[]> = {
  draft: [{ to: "scheduled", label: "Schedule" }],
  scheduled: [
    { to: "active", label: "Activate now" },
    { to: "paused", label: "Pause", variant: "secondary" },
    { to: "draft", label: "Back to draft", variant: "secondary" },
  ],
  active: [
    { to: "paused", label: "Pause", variant: "secondary" },
    { to: "closed", label: "Close", variant: "secondary" },
  ],
  paused: [
    { to: "active", label: "Resume" },
    { to: "closed", label: "Close", variant: "secondary" },
  ],
  closed: [{ to: "archived", label: "Archive", variant: "secondary" }],
  archived: [],
};

export default async function TestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const supabase = await createClient();

  const { data: test } = await supabase.from("tests").select("*").eq("id", id).maybeSingle();
  if (!test) {
    return (
      <div className="px-8 py-8">
        <p className="text-sm text-ink-muted">Test not found.</p>
      </div>
    );
  }

  const { data: testQuestions } = await supabase
    .from("test_questions")
    .select("id, marks, time_seconds, sort_order, question:questions(id, type, prompt)")
    .eq("test_id", id)
    .order("sort_order", { ascending: true });

  const usedQuestionIds = (testQuestions ?? []).map((tq: any) => tq.question?.id).filter(Boolean);

  const { data: availableQuestions } = await supabase
    .from("questions")
    .select("id, type, prompt")
    .order("created_at", { ascending: false });

  const pickable = (availableQuestions ?? []).filter((q) => !usedQuestionIds.includes(q.id));

  const totalMarks = (testQuestions ?? []).reduce((sum: number, tq: any) => sum + Number(tq.marks), 0);

  const boundUpdateConfig = updateTestConfig.bind(null, id);
  const boundAddQuestion = addQuestionToTest.bind(null, id);

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-xl font-semibold">{test.name}</h1>
        <StatusPill tone={test.status === "active" ? "success" : "neutral"}>{test.status}</StatusPill>
      </div>
      <Link href="/admin/tests" className="text-xs text-teal hover:underline">
        ← All tests
      </Link>

      <ErrorNote message={error} />
      {saved ? (
        <p className="border border-success bg-success-bg px-4 py-2.5 text-sm text-success mb-6 mt-6">
          Changes saved.
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        {(NEXT_STEPS[test.status] ?? []).map((step) => (
          <form key={step.to} action={updateTestStatus.bind(null, id, step.to as any)}>
            <Button type="submit" variant={step.variant ?? "primary"}>
              {step.label}
            </Button>
          </form>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-medium mb-4">Questions on this test</h2>
        <Panel className="mb-4">
          {!testQuestions || testQuestions.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-muted text-center">No questions added yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-ink-muted">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">Question</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Marks</th>
                  <th className="px-5 py-3 font-medium">Timer</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {testQuestions.map((tq: any, i: number) => (
                  <tr key={tq.id} className="border-b border-hairline last:border-0">
                    <td className="px-5 py-3 text-ink-muted">{i + 1}</td>
                    <td className="px-5 py-3 max-w-xs truncate">{tq.question?.prompt}</td>
                    <td className="px-5 py-3 text-ink-muted">
                      {tq.question?.type === "mcq" ? "MCQ" : "Short answer"}
                    </td>
                    <td className="px-5 py-3">{tq.marks}</td>
                    <td className="px-5 py-3">{tq.time_seconds}s</td>
                    <td className="px-5 py-3 text-right">
                      <form action={removeQuestionFromTest.bind(null, id, tq.id)}>
                        <Button type="submit" variant="ghost" className="text-danger">
                          Remove
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="border-t border-hairline px-5 py-3 text-sm text-ink-muted">
            Total marks: <span className="text-ink font-medium">{totalMarks}</span>
          </div>
        </Panel>

        {pickable.length > 0 ? (
          <Panel className="p-5">
            <form action={boundAddQuestion} className="grid grid-cols-[1fr_100px_100px_auto] gap-3 items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink-muted" htmlFor="question_id">
                  Add a question from the bank
                </label>
                <Select id="question_id" name="question_id" required defaultValue="">
                  <option value="" disabled>
                    Select a question…
                  </option>
                  {pickable.map((q) => (
                    <option key={q.id} value={q.id}>
                      [{q.type === "mcq" ? "MCQ" : "Short"}] {q.prompt.slice(0, 60)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink-muted" htmlFor="marks">
                  Marks
                </label>
                <TextInput id="marks" name="marks" type="number" min={0} step="0.5" placeholder="1" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink-muted" htmlFor="time_seconds">
                  Timer (s)
                </label>
                <TextInput id="time_seconds" name="time_seconds" type="number" min={5} placeholder="60" />
              </div>
              <Button type="submit">Add</Button>
            </form>
          </Panel>
        ) : (
          <p className="text-sm text-ink-muted">
            Every question in the bank is already on this test. {" "}
            <Link href="/admin/questions/new" className="text-teal hover:underline">
              Add a new question
            </Link>
            .
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium mb-4">Configuration</h2>
        <Panel className="p-8">
          <form action={boundUpdateConfig} className="flex flex-col gap-8">
            <TestConfigFields
              defaults={{
                name: test.name,
                description: test.description,
                time_zone: test.time_zone,
                start_at: test.start_at,
                end_at: test.end_at,
                attempt_limit: test.attempt_limit,
                max_violations: test.max_violations,
                warn_after_violations: test.warn_after_violations,
                randomize_questions: test.randomize_questions,
                randomize_options: test.randomize_options,
                sequential_navigation: test.sequential_navigation,
                require_fullscreen: test.require_fullscreen,
                disable_copy_paste: test.disable_copy_paste,
                disable_right_click: test.disable_right_click,
                disable_back_navigation: test.disable_back_navigation,
              }}
            />
            <Button type="submit" className="self-start">
              Save changes
            </Button>
          </form>
        </Panel>
      </section>
    </div>
  );
}
