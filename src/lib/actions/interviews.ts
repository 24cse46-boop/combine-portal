"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function localDateTimeToISO(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function upsertInterview(candidateId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", userData.user?.id)
    .maybeSingle();

  const status = String(formData.get("status") ?? "not_scheduled");
  const scheduled_at = localDateTimeToISO(String(formData.get("scheduled_at") ?? ""));
  const method_or_location = String(formData.get("method_or_location") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { data: existing } = await supabase
    .from("interviews")
    .select("id")
    .eq("candidate_id", candidateId)
    .maybeSingle();

  const payload = {
    candidate_id: candidateId,
    status,
    scheduled_at,
    method_or_location,
    notes,
    updated_by: admin?.id ?? null,
  };

  if (existing) {
    await supabase.from("interviews").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("interviews").insert(payload);
  }

  revalidatePath(`/admin/interviews/${candidateId}`);
  revalidatePath("/admin/interviews");
  redirect(`/admin/interviews/${candidateId}?saved=1`);
}
