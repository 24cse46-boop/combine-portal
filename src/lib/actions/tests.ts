"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type TestStatus = "draft" | "scheduled" | "active" | "paused" | "closed" | "archived";

function toRedirect(path: string, error: string): never {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

function localDateTimeToISO(value: string): string | null {
  // value comes from a <input type="datetime-local">, e.g. "2026-09-20T09:30"
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function createTest(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) toRedirect("/admin/tests/new", "Test name is required.");

  const description = String(formData.get("description") ?? "").trim() || null;
  const time_zone = String(formData.get("time_zone") ?? "Asia/Karachi").trim();
  const start_at = localDateTimeToISO(String(formData.get("start_at") ?? ""));
  const end_at = localDateTimeToISO(String(formData.get("end_at") ?? ""));
  const attempt_limit = Number(formData.get("attempt_limit") ?? 1) || 1;
  const max_violations = Number(formData.get("max_violations") ?? 3) || 3;
  const warn_after_violations = Number(formData.get("warn_after_violations") ?? 1) || 1;
  const randomize_questions = formData.get("randomize_questions") === "on";
  const randomize_options = formData.get("randomize_options") === "on";
  const sequential_navigation = formData.get("sequential_navigation") === "on";
  const require_fullscreen = formData.get("require_fullscreen") === "on";
  const disable_copy_paste = formData.get("disable_copy_paste") === "on";
  const disable_right_click = formData.get("disable_right_click") === "on";
  const disable_back_navigation = formData.get("disable_back_navigation") === "on";

  const { data: userData } = await supabase.auth.getUser();
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", userData.user?.id)
    .maybeSingle();

  const { data: test, error } = await supabase
    .from("tests")
    .insert({
      name,
      description,
      time_zone,
      start_at,
      end_at,
      attempt_limit,
      max_violations,
      warn_after_violations,
      randomize_questions,
      randomize_options,
      sequential_navigation,
      require_fullscreen,
      disable_copy_paste,
      disable_right_click,
      disable_back_navigation,
      created_by: admin?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !test) toRedirect("/admin/tests/new", "Could not create the test.");

  revalidatePath("/admin/tests");
  redirect(`/admin/tests/${test.id}`);
}

export async function updateTestConfig(testId: string, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) toRedirect(`/admin/tests/${testId}`, "Test name is required.");

  const description = String(formData.get("description") ?? "").trim() || null;
  const time_zone = String(formData.get("time_zone") ?? "Asia/Karachi").trim();
  const start_at = localDateTimeToISO(String(formData.get("start_at") ?? ""));
  const end_at = localDateTimeToISO(String(formData.get("end_at") ?? ""));
  const attempt_limit = Number(formData.get("attempt_limit") ?? 1) || 1;
  const max_violations = Number(formData.get("max_violations") ?? 3) || 3;
  const warn_after_violations = Number(formData.get("warn_after_violations") ?? 1) || 1;
  const randomize_questions = formData.get("randomize_questions") === "on";
  const randomize_options = formData.get("randomize_options") === "on";
  const sequential_navigation = formData.get("sequential_navigation") === "on";
  const require_fullscreen = formData.get("require_fullscreen") === "on";
  const disable_copy_paste = formData.get("disable_copy_paste") === "on";
  const disable_right_click = formData.get("disable_right_click") === "on";
  const disable_back_navigation = formData.get("disable_back_navigation") === "on";

  const { error } = await supabase
    .from("tests")
    .update({
      name,
      description,
      time_zone,
      start_at,
      end_at,
      attempt_limit,
      max_violations,
      warn_after_violations,
      randomize_questions,
      randomize_options,
      sequential_navigation,
      require_fullscreen,
      disable_copy_paste,
      disable_right_click,
      disable_back_navigation,
    })
    .eq("id", testId);

  if (error) toRedirect(`/admin/tests/${testId}`, "Could not save changes.");

  revalidatePath(`/admin/tests/${testId}`);
  revalidatePath("/admin/tests");
  redirect(`/admin/tests/${testId}?saved=1`);
}

const ALLOWED_TRANSITIONS: Record<TestStatus, TestStatus[]> = {
  draft: ["scheduled"],
  scheduled: ["active", "paused", "draft"],
  active: ["paused", "closed"],
  paused: ["active", "closed"],
  closed: ["archived"],
  archived: [],
};

export async function updateTestStatus(testId: string, nextStatus: TestStatus) {
  const supabase = await createClient();

  const { data: test } = await supabase
    .from("tests")
    .select("status")
    .eq("id", testId)
    .maybeSingle();

  if (!test) toRedirect("/admin/tests", "Test not found.");

  const allowed = ALLOWED_TRANSITIONS[test.status as TestStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    toRedirect(`/admin/tests/${testId}`, `Cannot move a ${test.status} test to ${nextStatus}.`);
  }

  const { error } = await supabase.from("tests").update({ status: nextStatus }).eq("id", testId);
  if (error) toRedirect(`/admin/tests/${testId}`, "Could not update status.");

  revalidatePath(`/admin/tests/${testId}`);
  revalidatePath("/admin/tests");
  redirect(`/admin/tests/${testId}`);
}
