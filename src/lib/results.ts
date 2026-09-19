import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Called whenever an attempt transitions to submitted/auto_submitted
 * (normal finish, timeout-triggered final submit, violation auto-submit,
 * or an admin's "force submit"). Computes the MCQ score from the answers
 * already scored inline on submit, leaves the short-answer score at 0
 * until an admin grades it, and sets review_status so `/admin/results`
 * knows whether anything needs a human look.
 *
 * Uses the service role client because candidates have no RLS access to
 * `results` at all (by design — no score is ever shown to them), and this
 * runs inside candidate-authenticated requests (submitAnswer, the
 * violations route) as well as admin ones.
 */
export async function finalizeAttemptResult(attemptId: string) {
  const supabase = createServiceRoleClient();

  const { data: answers } = await supabase
    .from("answers")
    .select("mcq_marks_awarded, mcq_is_correct, short_answer_marks_awarded, test_question:test_questions(marks, question:questions(type))")
    .eq("attempt_id", attemptId);

  let mcqScore = 0;
  let shortAnswerScore = 0;
  let hasShortAnswer = false;
  let allShortAnswerGraded = true;

  for (const a of answers ?? []) {
    const tq = a.test_question as unknown as { marks: number; question: { type: string } } | null;
    if (!tq) continue;
    if (tq.question?.type === "mcq") {
      const awarded = a.mcq_is_correct ? Number(tq.marks) : 0;
      mcqScore += awarded;
    } else if (tq.question?.type === "short_answer") {
      hasShortAnswer = true;
      if (a.short_answer_marks_awarded === null || a.short_answer_marks_awarded === undefined) {
        allShortAnswerGraded = false;
      } else {
        shortAnswerScore += Number(a.short_answer_marks_awarded);
      }
    }
  }

  const totalScore = mcqScore + shortAnswerScore;
  const reviewStatus = hasShortAnswer && !allShortAnswerGraded ? "pending" : "completed";

  await supabase.from("results").upsert(
    {
      attempt_id: attemptId,
      mcq_score: mcqScore,
      short_answer_score: shortAnswerScore,
      total_score: totalScore,
      review_status: reviewStatus,
    },
    { onConflict: "attempt_id" }
  );
}
