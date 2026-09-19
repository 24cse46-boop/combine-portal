"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function assignCandidateToTest(formData: FormData) {
  const supabase = await createClient();
  const test_id = String(formData.get("test_id") ?? "");
  const candidate_id = String(formData.get("candidate_id") ?? "");

  if (!test_id || !candidate_id) {
    redirect(`/admin/assignments?error=${encodeURIComponent("Pick a test and a candidate.")}`);
  }

  const { data: userData } = await supabase.auth.getUser();
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", userData.user?.id)
    .maybeSingle();

  const { error } = await supabase.from("test_assignments").upsert(
    {
      test_id,
      candidate_id,
      assigned_by: admin?.id ?? null,
      is_active: true,
      assigned_at: new Date().toISOString(),
    },
    { onConflict: "test_id,candidate_id" }
  );

  if (error) {
    redirect(`/admin/assignments?error=${encodeURIComponent("Could not assign the candidate.")}`);
  }

  revalidatePath("/admin/assignments");
  redirect(`/admin/assignments?test=${test_id}`);
}

export async function setAssignmentActive(assignmentId: string, isActive: boolean, testId: string) {
  const supabase = await createClient();
  await supabase.from("test_assignments").update({ is_active: isActive }).eq("id", assignmentId);
  revalidatePath("/admin/assignments");
  redirect(`/admin/assignments?test=${testId}`);
}
