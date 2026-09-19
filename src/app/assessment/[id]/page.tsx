import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { startAttempt, submitAnswer } from "@/lib/actions/attempts";
import { seededShuffle } from "@/lib/shuffle";
import { Button, Checkbox, ErrorNote, Panel, Textarea } from "@/components/ui";
import { QuestionTimer } from "@/components/question-timer";
import { ViolationMonitor } from "@/components/violation-monitor";

export default async function AssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id: testId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, full_name")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (!candidate) redirect("/login");

  const { data: test } = await supabase
    .from("tests")
    .select(
      "id, name, sequential_navigation, require_fullscreen, disable_copy_paste, disable_right_click, disable_back_navigation, randomize_options, max_violations, warn_after_violations"
    )
    .eq("id", testId)
    .maybeSingle();
  if (!test) redirect("/dashboard");

  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, status, current_question_index, question_order")
    .eq("test_id", testId)
    .eq("candidate_id", candidate.id)
    .maybeSingle();

  if (attempt?.status === "submitted" || attempt?.status === "auto_submitted") {
    redirect(`/assessment/${testId}/submitted`);
  }

  // ---------------------------------------------------------------------
  // No attempt yet: rules + agreement screen. Creating the attempt (and
  // locking in the question order) happens server-side in startAttempt.
  // ---------------------------------------------------------------------
  if (!attempt) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <ErrorNote message={error} />
          <Panel className="p-8">
            <h1 className="font-display text-xl font-semibold mb-4">{test.name}</h1>
            <p className="text-sm text-ink-muted mb-4">Before you begin, please note:</p>
            <ul className="text-sm text-ink-muted list-disc pl-5 mb-6 space-y-1.5">
              <li>Each question has its own timer — once it expires you move on automatically.</li>
              {test.sequential_navigation ? (
                <li>You cannot go back to a previous question once you&apos;ve moved on.</li>
              ) : null}
              {test.require_fullscreen ? <li>This assessment must be taken in fullscreen.</li> : null}
              {test.disable_copy_paste ? <li>Copy and paste are disabled.</li> : null}
              {test.disable_right_click ? <li>Right-click is disabled.</li> : null}
              {test.disable_back_navigation ? <li>Browser back navigation is disabled.</li> : null}
              <li>
                Leaving the tab, exiting fullscreen, or refreshing is logged. After{" "}
                {test.warn_after_violations} such event(s) you&apos;ll be warned; after{" "}
                {test.max_violations} your attempt is automatically submitted.
              </li>
              <li>Once submitted, you cannot retake this assessment.</li>
            </ul>
            <form action={startAttempt.bind(null, testId)} className="flex flex-col gap-4">
              <Checkbox
                name="agree"
                label="I have read and agree to these rules, and I'm ready to begin."
              />
              <Button type="submit">Begin assessment</Button>
            </form>
          </Panel>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------------
  // In-progress attempt: render the current question only. Timing is
  // server-authoritative — see the `answers.question_started_at` upsert
  // below and the elapsed-time check in submitAnswer().
  // ---------------------------------------------------------------------
  const order = (attempt.question_order as string[]) ?? [];
  const testQuestionId = order[attempt.current_question_index];

  if (!testQuestionId) redirect(`/assessment/${testId}/submitted`);

  const serviceClient = createServiceRoleClient();
  const { data: tq } = await serviceClient
    .from("test_questions")
    .select("id, marks, time_seconds, question:questions(id, type, prompt, options:question_options(id, option_text))")
    .eq("id", testQuestionId)
    .maybeSingle();

  if (!tq) redirect("/dashboard");

  // Server-record the moment this question was first shown, if not already
  // recorded (refreshing the page must never reset the clock).
  const { data: existingAnswer } = await supabase
    .from("answers")
    .select("id, question_started_at, selected_option_id, short_answer_text")
    .eq("attempt_id", attempt.id)
    .eq("test_question_id", testQuestionId)
    .maybeSingle();

  let questionStartedAt = existingAnswer?.question_started_at;
  if (!questionStartedAt) {
    questionStartedAt = new Date().toISOString();
    await supabase
      .from("answers")
      .insert({ attempt_id: attempt.id, test_question_id: testQuestionId, question_started_at: questionStartedAt });
  }

  const elapsedSeconds =
    // eslint-disable-next-line react-hooks/purity -- server component: wall-clock read is required to compute the server-authoritative countdown
    (Date.now() - new Date(questionStartedAt).getTime()) / 1000;
  const remainingSeconds = Math.max(0, tq.time_seconds - elapsedSeconds);

  const question = tq.question as unknown as {
    id: string;
    type: "mcq" | "short_answer";
    prompt: string;
    options: { id: string; option_text: string }[];
  };

  const displayOptions = test.randomize_options
    ? seededShuffle(question.options, `${attempt.id}:${testQuestionId}`)
    : question.options;

  const questionNumber = attempt.current_question_index + 1;
  const totalQuestions = order.length;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <ViolationMonitor
          attemptId={attempt.id}
          testId={testId}
          requireFullscreen={test.require_fullscreen}
          disableCopyPaste={test.disable_copy_paste}
          disableRightClick={test.disable_right_click}
          disableBackNavigation={test.disable_back_navigation}
          maxViolations={test.max_violations}
          warnAfterViolations={test.warn_after_violations}
        />

        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-ink-muted">
            Question {questionNumber} of {totalQuestions} · {tq.marks} mark{Number(tq.marks) === 1 ? "" : "s"}
          </p>
          <QuestionTimer formId="answer-form" initialRemainingSeconds={remainingSeconds} />
        </div>

        <Panel className="p-8">
          <h1 className="font-display text-lg font-semibold mb-6 whitespace-pre-wrap">{question.prompt}</h1>

          <form id="answer-form" action={submitAnswer.bind(null, testId)} className="flex flex-col gap-4">
            <input type="hidden" name="attempt_id" value={attempt.id} />
            <input type="hidden" name="test_question_id" value={testQuestionId} />

            {question.type === "mcq" ? (
              <div className="flex flex-col gap-3">
                {displayOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-3 border border-hairline px-4 py-3 text-sm has-[:checked]:border-teal"
                  >
                    <input
                      type="radio"
                      name="selected_option_id"
                      value={opt.id}
                      defaultChecked={existingAnswer?.selected_option_id === opt.id}
                      required
                      className="accent-teal"
                    />
                    {opt.option_text}
                  </label>
                ))}
              </div>
            ) : (
              <Textarea
                name="short_answer_text"
                rows={6}
                defaultValue={existingAnswer?.short_answer_text ?? ""}
                placeholder="Type your answer…"
                required
              />
            )}

            <Button type="submit" className="self-end">
              {questionNumber === totalQuestions ? "Submit assessment" : "Next question"}
            </Button>
          </form>
        </Panel>
      </div>
    </main>
  );
}
