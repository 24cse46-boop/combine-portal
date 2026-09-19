import Link from "next/link";
// Joined Supabase selects (question:questions(...), options:question_options(...))
// don't have a generated row type in this project yet, so the spots that
// read the joined shape stay loosely typed rather than hand-rolling one.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { saveShortAnswerGrades, updateFinalStatus } from "@/lib/actions/results";
import { Button, Field, Panel, Select, StatusPill, TextInput, Textarea } from "@/components/ui";

export default async function ResultDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { attemptId } = await params;
  const { saved } = await searchParams;
  const supabase = await createClient();

  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, status, candidate:candidates(full_name, email), test:tests(id, name)")
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt) {
    return (
      <div className="px-8 py-8">
        <p className="text-sm text-ink-muted">Attempt not found.</p>
      </div>
    );
  }

  const { data: result } = await supabase
    .from("results")
    .select("id, mcq_score, short_answer_score, total_score, review_status, final_status, admin_notes")
    .eq("attempt_id", attemptId)
    .maybeSingle();

  const { data: testQuestions } = await supabase
    .from("test_questions")
    .select(
      "id, marks, sort_order, question:questions(id, type, prompt, options:question_options(id, option_text, is_correct))"
    )
    .eq("test_id", (attempt.test as unknown as { id: string })?.id)
    .order("sort_order", { ascending: true });

  const { data: answers } = await supabase
    .from("answers")
    .select("test_question_id, selected_option_id, short_answer_text, mcq_is_correct, mcq_marks_awarded, short_answer_marks_awarded")
    .eq("attempt_id", attemptId);

  const answerByQuestion = new Map((answers ?? []).map((a) => [a.test_question_id, a]));

  const candidate = attempt.candidate as unknown as { full_name: string; email: string };
  const test = attempt.test as unknown as { id: string; name: string };

  return (
    <div className="px-8 py-8 max-w-3xl">
      <Link href="/admin/results" className="text-xs text-teal hover:underline">
        ← All results
      </Link>
      <div className="flex items-start justify-between mt-1 mb-8">
        <div>
          <h1 className="font-display text-xl font-semibold">{candidate?.full_name}</h1>
          <p className="text-sm text-ink-muted">
            {candidate?.email} · {test?.name}
          </p>
        </div>
        {result ? (
          <div className="text-right">
            <p className="font-display text-2xl font-semibold">{result.total_score}</p>
            <p className="text-xs text-ink-muted">
              {result.mcq_score} MCQ + {result.short_answer_score} short answer
            </p>
          </div>
        ) : null}
      </div>

      {saved ? (
        <p className="border border-success bg-success-bg px-4 py-2.5 text-sm text-success mb-6">
          Saved.
        </p>
      ) : null}

      <form action={saveShortAnswerGrades.bind(null, attemptId)} className="flex flex-col gap-6 mb-10">
        {(testQuestions ?? []).map((tq: any, i: number) => {
          const answer = answerByQuestion.get(tq.id);
          const question = tq.question;
          return (
            <Panel key={tq.id} className="p-6">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-ink-muted">
                  Question {i + 1} · {tq.marks} mark{Number(tq.marks) === 1 ? "" : "s"}
                </p>
                {question.type === "mcq" ? (
                  <StatusPill tone={answer?.mcq_is_correct ? "success" : "danger"}>
                    {answer?.mcq_is_correct ? "Correct" : "Incorrect"} · {answer?.mcq_marks_awarded ?? 0} awarded
                  </StatusPill>
                ) : null}
              </div>
              <p className="text-sm mb-4 whitespace-pre-wrap">{question.prompt}</p>

              {question.type === "mcq" ? (
                <ul className="flex flex-col gap-1.5 mb-2">
                  {question.options.map((opt: any) => {
                    const wasSelected = answer?.selected_option_id === opt.id;
                    return (
                      <li
                        key={opt.id}
                        className={[
                          "px-3 py-2 text-sm border",
                          opt.is_correct ? "border-success bg-success-bg" : "border-hairline",
                          wasSelected && !opt.is_correct ? "border-danger bg-danger-bg" : "",
                        ].join(" ")}
                      >
                        {opt.option_text}
                        {opt.is_correct ? " · correct answer" : ""}
                        {wasSelected ? " · candidate's answer" : ""}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="border border-hairline bg-paper px-3 py-2.5 text-sm whitespace-pre-wrap min-h-[3rem]">
                    {answer?.short_answer_text || <span className="text-ink-muted">No answer given.</span>}
                  </div>
                  <Field
                    label={`Marks (out of ${tq.marks})`}
                    htmlFor={`marks_${tq.id}`}
                  >
                    <TextInput
                      id={`marks_${tq.id}`}
                      name={`marks_${tq.id}`}
                      type="number"
                      min={0}
                      max={tq.marks}
                      step="0.5"
                      defaultValue={answer?.short_answer_marks_awarded ?? ""}
                      className="max-w-[8rem]"
                    />
                  </Field>
                </div>
              )}
            </Panel>
          );
        })}
        <Button type="submit" className="self-start">
          Save grades
        </Button>
      </form>

      {result ? (
        <section>
          <h2 className="text-sm font-medium mb-4">Decision</h2>
          <Panel className="p-6">
            <form action={updateFinalStatus.bind(null, attemptId, result.id)} className="flex flex-col gap-5">
              <Field label="Final status" htmlFor="final_status">
                <Select id="final_status" name="final_status" defaultValue={result.final_status}>
                  <option value="pending">Pending</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="selected">Selected</option>
                  <option value="rejected">Rejected</option>
                  <option value="on_hold">On hold</option>
                </Select>
              </Field>
              <Field label="Admin notes" htmlFor="admin_notes">
                <Textarea id="admin_notes" name="admin_notes" rows={3} defaultValue={result.admin_notes ?? ""} />
              </Field>
              <Button type="submit" className="self-start">
                Save decision
              </Button>
            </form>
          </Panel>
        </section>
      ) : null}
    </div>
  );
}
