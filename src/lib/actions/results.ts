"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { finalizeAttemptResult } from "@/lib/results";

/**
 * Reads one `marks_<testQuestionId>` field per short-answer question from
 * the form and writes it onto that answer row, then recomputes the
 * attempt's results row (MCQ score is already locked in from submit time;
 * this only changes the short-answer contribution and review_status).
 */
export async function saveShortAnswerGrades(attemptId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", userData.user?.id)
    .maybeSingle();

  const { data: answers } = await supabase
    .from("answers")
    .select("id, test_question_id, test_question:test_questions(marks, question:questions(type))")
    .eq("attempt_id", attemptId);

  for (const a of answers ?? []) {
    const tq = a.test_question as unknown as { marks: number; question: { type: string } } | null;
    if (tq?.question?.type !== "short_answer") continue;

    const raw = formData.get(`marks_${a.test_question_id}`);
    if (raw === null || raw === "") continue;

    let marks = Number(raw);
    if (Number.isNaN(marks)) continue;
    marks = Math.max(0, Math.min(marks, Number(tq.marks)));

    await supabase
      .from("answers")
      .update({
        short_answer_marks_awarded: marks,
        reviewed_by: admin?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", a.id);
  }

  await finalizeAttemptResult(attemptId);

  revalidatePath(`/admin/results/${attemptId}`);
  revalidatePath("/admin/results");
  redirect(`/admin/results/${attemptId}?saved=1`);
}

export async function updateFinalStatus(attemptId: string, resultId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", userData.user?.id)
    .maybeSingle();

  const final_status = String(formData.get("final_status") ?? "pending");
  const admin_notes = String(formData.get("admin_notes") ?? "").trim() || null;

  await supabase
    .from("results")
    .update({
      final_status,
      admin_notes,
      finalized_by: final_status === "pending" ? null : admin?.id ?? null,
      finalized_at: final_status === "pending" ? null : new Date().toISOString(),
    })
    .eq("id", resultId);

  revalidatePath(`/admin/results/${attemptId}`);
  revalidatePath("/admin/results");
  redirect(`/admin/results/${attemptId}?saved=1`);
}
