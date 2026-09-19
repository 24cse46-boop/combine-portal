"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function toRedirect(path: string, error: string): never {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

export async function createQuestion(formData: FormData) {
  const supabase = await createClient();

  const type = String(formData.get("type") ?? "mcq") as "mcq" | "short_answer";
  const prompt = String(formData.get("prompt") ?? "").trim();
  const default_marks = Number(formData.get("default_marks") ?? 1) || 1;
  const default_time_seconds = Number(formData.get("default_time_seconds") ?? 60) || 60;

  if (!prompt) toRedirect("/admin/questions/new", "Question text is required.");

  const { data: userData } = await supabase.auth.getUser();
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", userData.user?.id)
    .maybeSingle();

  if (type === "mcq") {
    const optionTexts = formData
      .getAll("option_text")
      .map((v) => String(v).trim())
      .filter(Boolean);
    const correctIndex = Number(formData.get("correct_index") ?? -1);

    if (optionTexts.length < 2) {
      toRedirect("/admin/questions/new", "MCQs need at least two options.");
    }
    if (correctIndex < 0 || correctIndex >= optionTexts.length) {
      toRedirect("/admin/questions/new", "Mark one option as correct.");
    }

    const { data: question, error } = await supabase
      .from("questions")
      .insert({ type, prompt, default_marks, default_time_seconds, created_by: admin?.id ?? null })
      .select("id")
      .single();

    if (error || !question) toRedirect("/admin/questions/new", "Could not create the question.");

    const optionRows = optionTexts.map((option_text, i) => ({
      question_id: question.id,
      option_text,
      is_correct: i === correctIndex,
      sort_order: i,
    }));

    const { error: optionsError } = await supabase.from("question_options").insert(optionRows);
    if (optionsError) {
      await supabase.from("questions").delete().eq("id", question.id);
      toRedirect("/admin/questions/new", "Could not save the options.");
    }
  } else {
    const { error } = await supabase
      .from("questions")
      .insert({ type, prompt, default_marks, default_time_seconds, created_by: admin?.id ?? null });
    if (error) toRedirect("/admin/questions/new", "Could not create the question.");
  }

  revalidatePath("/admin/questions");
  redirect("/admin/questions");
}

export async function updateQuestionMeta(questionId: string, formData: FormData) {
  const supabase = await createClient();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const default_marks = Number(formData.get("default_marks") ?? 1) || 1;
  const default_time_seconds = Number(formData.get("default_time_seconds") ?? 60) || 60;

  if (!prompt) toRedirect(`/admin/questions/${questionId}`, "Question text is required.");

  const { error } = await supabase
    .from("questions")
    .update({ prompt, default_marks, default_time_seconds })
    .eq("id", questionId);

  if (error) toRedirect(`/admin/questions/${questionId}`, "Could not save changes.");

  revalidatePath(`/admin/questions/${questionId}`);
  revalidatePath("/admin/questions");
  redirect(`/admin/questions/${questionId}?saved=1`);
}

export async function setCorrectOption(questionId: string, optionId: string) {
  const supabase = await createClient();
  await supabase.from("question_options").update({ is_correct: false }).eq("question_id", questionId);
  await supabase.from("question_options").update({ is_correct: true }).eq("id", optionId);
  revalidatePath(`/admin/questions/${questionId}`);
  redirect(`/admin/questions/${questionId}`);
}

export async function addOption(questionId: string, formData: FormData) {
  const supabase = await createClient();
  const option_text = String(formData.get("option_text") ?? "").trim();
  if (!option_text) toRedirect(`/admin/questions/${questionId}`, "Option text is required.");

  const { count } = await supabase
    .from("question_options")
    .select("id", { count: "exact", head: true })
    .eq("question_id", questionId);

  await supabase
    .from("question_options")
    .insert({ question_id: questionId, option_text, sort_order: count ?? 0 });

  revalidatePath(`/admin/questions/${questionId}`);
  redirect(`/admin/questions/${questionId}`);
}

export async function deleteOption(questionId: string, optionId: string) {
  const supabase = await createClient();
  await supabase.from("question_options").delete().eq("id", optionId).eq("question_id", questionId);
  revalidatePath(`/admin/questions/${questionId}`);
  redirect(`/admin/questions/${questionId}`);
}

export async function deleteQuestion(questionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("questions").delete().eq("id", questionId);
  if (error) {
    toRedirect(
      "/admin/questions",
      "Could not delete — this question is used on one or more tests."
    );
  }
  revalidatePath("/admin/questions");
  redirect("/admin/questions");
}
