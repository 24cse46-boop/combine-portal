"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addQuestionToTest(testId: string, formData: FormData) {
  const supabase = await createClient();
  const question_id = String(formData.get("question_id") ?? "");
  if (!question_id) redirect(`/admin/tests/${testId}?error=${encodeURIComponent("Pick a question.")}`);

  const { data: question } = await supabase
    .from("questions")
    .select("default_marks, default_time_seconds")
    .eq("id", question_id)
    .maybeSingle();

  const marks = Number(formData.get("marks") ?? question?.default_marks ?? 1) || 1;
  const time_seconds =
    Number(formData.get("time_seconds") ?? question?.default_time_seconds ?? 60) || 60;

  const { count } = await supabase
    .from("test_questions")
    .select("id", { count: "exact", head: true })
    .eq("test_id", testId);

  const { error } = await supabase.from("test_questions").insert({
    test_id: testId,
    question_id,
    marks,
    time_seconds,
    sort_order: count ?? 0,
  });

  if (error) {
    const message = error.code === "23505" ? "That question is already on this test." : "Could not add the question.";
    redirect(`/admin/tests/${testId}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/admin/tests/${testId}`);
  redirect(`/admin/tests/${testId}`);
}

export async function removeQuestionFromTest(testId: string, testQuestionId: string) {
  const supabase = await createClient();
  await supabase.from("test_questions").delete().eq("id", testQuestionId).eq("test_id", testId);
  revalidatePath(`/admin/tests/${testId}`);
  redirect(`/admin/tests/${testId}`);
}
