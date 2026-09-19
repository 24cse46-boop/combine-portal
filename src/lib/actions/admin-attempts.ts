"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { finalizeAttemptResult } from "@/lib/results";

export async function forceSubmitAttempt(attemptId: string) {
  const supabase = await createClient();
  const { data: updated } = await supabase
    .from("attempts")
    .update({ status: "auto_submitted", submitted_at: new Date().toISOString() })
    .eq("id", attemptId)
    .eq("status", "in_progress")
    .select("id")
    .maybeSingle();

  if (updated) await finalizeAttemptResult(attemptId);

  revalidatePath("/admin/attempts");
  redirect("/admin/attempts");
}
