"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function toRedirect(error: string): never {
  redirect(`/admin/questions?ai_error=${encodeURIComponent(error)}`);
}

type GeneratedQuestion = {
  type: "mcq" | "short_answer";
  prompt: string;
  marks: number;
  time_seconds: number;
  options?: { text: string; correct: boolean }[];
};

/**
 * Calls Claude to draft a batch of questions on a topic, then inserts them
 * directly into the shared question bank (same tables/shape as a manually
 * created question — nothing about how they're graded or attached to a
 * test is any different). Admins review/edit/delete them like any other
 * question afterwards; nothing is shown to candidates until an admin
 * explicitly adds it to a test.
 */
export async function generateQuestionsWithAI(formData: FormData) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    toRedirect(
      "AI question generation isn't configured — ask whoever manages deployment to add an ANTHROPIC_API_KEY environment variable."
    );
  }

  const topic = String(formData.get("topic") ?? "").trim();
  const count = Math.min(20, Math.max(1, Number(formData.get("count") ?? 5) || 5));
  const type = String(formData.get("type") ?? "mcq") as "mcq" | "short_answer" | "mixed";
  const difficulty = String(formData.get("difficulty") ?? "medium");

  if (!topic) toRedirect("Describe a topic first.");

  const typeInstruction =
    type === "mixed"
      ? "a mix of multiple-choice and short-answer questions"
      : type === "mcq"
        ? "multiple-choice questions, each with exactly 4 options and exactly one correct option"
        : "short-answer questions (no options — open-ended, graded by a human later)";

  const systemPrompt = `You write assessment questions for a volunteer program's screening test. Return ONLY a JSON array, no prose, no markdown fences. Each element: {"type":"mcq"|"short_answer","prompt":string,"marks":number,"time_seconds":number,"options":[{"text":string,"correct":boolean}] (omit "options" for short_answer)}. Exactly one option must have "correct": true for every mcq. Keep prompts clear and unambiguous.`;

  const userPrompt = `Topic: ${topic}\nDifficulty: ${difficulty}\nGenerate ${count} ${typeInstruction}.`;

  let generated: GeneratedQuestion[];
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) toRedirect(`AI request failed (${res.status}). Check the API key.`);

    const data = await res.json();
    const text = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();

    generated = JSON.parse(text);
    if (!Array.isArray(generated)) throw new Error("not an array");
  } catch {
    toRedirect("Could not parse the AI's response. Try again, or lower the question count.");
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", userData.user?.id)
    .maybeSingle();

  let created = 0;
  for (const q of generated) {
    if (!q.prompt || (q.type !== "mcq" && q.type !== "short_answer")) continue;

    const { data: question, error } = await supabase
      .from("questions")
      .insert({
        type: q.type,
        prompt: q.prompt,
        default_marks: q.marks || 1,
        default_time_seconds: q.time_seconds || 60,
        created_by: admin?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !question) continue;

    if (q.type === "mcq" && Array.isArray(q.options) && q.options.length >= 2) {
      await supabase.from("question_options").insert(
        q.options.map((opt, i) => ({
          question_id: question.id,
          option_text: opt.text,
          is_correct: Boolean(opt.correct),
          sort_order: i,
        }))
      );
    }
    created += 1;
  }

  revalidatePath("/admin/questions");
  redirect(`/admin/questions?ai_created=${created}`);
}
