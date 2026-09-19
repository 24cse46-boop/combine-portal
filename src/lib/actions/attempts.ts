"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { seededShuffle } from "@/lib/shuffle";
import { finalizeAttemptResult } from "@/lib/results";

async function requireCandidate(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const { data: candidate } = await supabase
    .from("candidates")
    .select("id")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (!candidate) redirect("/login");
  return candidate;
}

/**
 * Creates the attempt row the first time a candidate begins a test:
 * records their agreement to the rules, locks in the (possibly randomized)
 * question order for the whole attempt, and opens question 0. Re-entrant —
 * if an attempt already exists, just sends them back into it (this is how
 * "connection recovery" / refresh works, per Section 8/18).
 */
export async function startAttempt(testId: string, formData: FormData) {
  const supabase = await createClient();
  const candidate = await requireCandidate(supabase);

  const agreed = formData.get("agree") === "on";
  if (!agreed) {
    redirect(`/assessment/${testId}?error=${encodeURIComponent("You must accept the rules to begin.")}`);
  }

  const { data: assignment } = await supabase
    .from("test_assignments")
    .select("id")
    .eq("test_id", testId)
    .eq("candidate_id", candidate.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!assignment) redirect("/dashboard");

  const { data: test } = await supabase
    .from("tests")
    .select("id, status, start_at, end_at, randomize_questions")
    .eq("id", testId)
    .maybeSingle();
  if (!test) redirect("/dashboard");

  const now = Date.now();
  const withinWindow =
    (!test.start_at || new Date(test.start_at).getTime() <= now) &&
    (!test.end_at || new Date(test.end_at).getTime() >= now);

  if (test.status !== "active" || !withinWindow) {
    redirect(`/dashboard?error=${encodeURIComponent("This test is not currently open.")}`);
  }

  const { data: existing } = await supabase
    .from("attempts")
    .select("id, status")
    .eq("test_id", testId)
    .eq("candidate_id", candidate.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === "submitted" || existing.status === "auto_submitted") {
      redirect(`/assessment/${testId}/submitted`);
    }
    redirect(`/assessment/${testId}`);
  }

  const serviceClient = createServiceRoleClient();
  const { data: testQuestions } = await serviceClient
    .from("test_questions")
    .select("id")
    .eq("test_id", testId)
    .order("sort_order", { ascending: true });

  if (!testQuestions || testQuestions.length === 0) {
    redirect(`/dashboard?error=${encodeURIComponent("This test has no questions yet.")}`);
  }

  let orderedIds = testQuestions.map((q) => q.id);
  if (test.randomize_questions) {
    orderedIds = seededShuffle(orderedIds, `${testId}:${candidate.id}`);
  }

  const { error } = await supabase.from("attempts").insert({
    test_id: testId,
    candidate_id: candidate.id,
    status: "in_progress",
    current_question_index: 0,
    started_at: new Date().toISOString(),
    agreed_to_rules_at: new Date().toISOString(),
    question_order: orderedIds,
  });

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent("Could not start the attempt. Try again.")}`);
  }

  revalidatePath(`/assessment/${testId}`);
  redirect(`/assessment/${testId}`);
}

/**
 * Records the candidate's response to the CURRENT question and advances
 * the attempt. Elapsed time is computed from the server-recorded
 * `question_started_at` on the answer row, never from anything the client
 * sends — a late submission is accepted but flagged `auto_advanced`.
 */
export async function submitAnswer(testId: string, formData: FormData) {
  const supabase = await createClient();
  const candidate = await requireCandidate(supabase);

  const attemptId = String(formData.get("attempt_id") ?? "");
  const testQuestionId = String(formData.get("test_question_id") ?? "");
  const selectedOptionId = String(formData.get("selected_option_id") ?? "") || null;
  const shortAnswerText = formData.has("short_answer_text")
    ? String(formData.get("short_answer_text") ?? "")
    : null;
  const timedOut = formData.get("timed_out") === "1";

  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, candidate_id, status, current_question_index, question_order")
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt || attempt.candidate_id !== candidate.id || attempt.status !== "in_progress") {
    redirect(`/assessment/${testId}`);
  }

  const order = (attempt.question_order as string[]) ?? [];
  const expectedTestQuestionId = order[attempt.current_question_index];
  if (expectedTestQuestionId !== testQuestionId) {
    // Stale form (double-submit / back button) — just re-render the real
    // current question instead of trusting the posted one.
    redirect(`/assessment/${testId}`);
  }

  const serviceClient = createServiceRoleClient();
  const { data: tq } = await serviceClient
    .from("test_questions")
    .select("id, marks, time_seconds, question:questions(type)")
    .eq("id", testQuestionId)
    .maybeSingle();

  const { data: existingAnswer } = await supabase
    .from("answers")
    .select("id, question_started_at")
    .eq("attempt_id", attemptId)
    .eq("test_question_id", testQuestionId)
    .maybeSingle();

  const startedAt = existingAnswer?.question_started_at
    ? new Date(existingAnswer.question_started_at).getTime()
    : Date.now();
  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  const overtime = tq ? elapsedSeconds > tq.time_seconds + 3 : false; // +3s grace for request latency

  let mcqIsCorrect: boolean | null = null;
  let mcqMarksAwarded: number | null = null;
  if (tq && (tq.question as unknown as { type: string })?.type === "mcq" && selectedOptionId) {
    const { data: option } = await serviceClient
      .from("question_options")
      .select("is_correct")
      .eq("id", selectedOptionId)
      .maybeSingle();
    mcqIsCorrect = option?.is_correct ?? false;
    mcqMarksAwarded = mcqIsCorrect ? Number(tq.marks) : 0;
  }

  const answerPayload = {
    attempt_id: attemptId,
    test_question_id: testQuestionId,
    selected_option_id: selectedOptionId,
    short_answer_text: shortAnswerText,
    answered_at: new Date().toISOString(),
    auto_advanced: timedOut || overtime,
    mcq_is_correct: mcqIsCorrect,
    mcq_marks_awarded: mcqMarksAwarded,
  };

  if (existingAnswer) {
    await supabase.from("answers").update(answerPayload).eq("id", existingAnswer.id);
  } else {
    await supabase.from("answers").insert({ ...answerPayload, question_started_at: new Date(startedAt).toISOString() });
  }

  const nextIndex = attempt.current_question_index + 1;
  const isLast = nextIndex >= order.length;

  if (isLast) {
    await supabase
      .from("attempts")
      .update({
        status: timedOut ? "auto_submitted" : "submitted",
        submitted_at: new Date().toISOString(),
        current_question_index: nextIndex,
      })
      .eq("id", attemptId);

    await finalizeAttemptResult(attemptId);

    revalidatePath(`/assessment/${testId}`);
    redirect(`/assessment/${testId}/submitted`);
  }

  await supabase.from("attempts").update({ current_question_index: nextIndex }).eq("id", attemptId);
  revalidatePath(`/assessment/${testId}`);
  redirect(`/assessment/${testId}`);
}
