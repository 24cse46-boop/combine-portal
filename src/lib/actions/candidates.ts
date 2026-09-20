"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

function toRedirect(error: string): never {
  redirect(`/admin/candidates?error=${encodeURIComponent(error)}`);
}

async function createOneCandidate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  input: { full_name: string; email: string; phone?: string; password: string; application_id?: string }
) {
  const email = input.email.trim().toLowerCase();
  if (!input.full_name.trim() || !email || input.password.length < 6) {
    return { ok: false, email, reason: "Missing name/email, or password too short" };
  }

  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return { ok: false, email, reason: createError?.message ?? "Could not create login" };
  }

  const { error: insertError } = await supabase.from("candidates").insert({
    auth_user_id: created.user.id,
    full_name: input.full_name.trim(),
    email,
    phone: input.phone?.trim() || null,
    application_id: input.application_id?.trim() || null,
    must_change_password: true,
  });

  if (insertError) {
    await serviceClient.auth.admin.deleteUser(created.user.id);
    return { ok: false, email, reason: "Could not save candidate record" };
  }

  return { ok: true, email, reason: null };
}

/**
 * Single-candidate form: creates the confirmed Auth login (with whatever
 * password the admin hands out — a phone number, per how this org is
 * running it) plus the `candidates` row. `must_change_password` stays
 * true, so the candidate is forced onto a password only they know the
 * first time they sign in.
 */
export async function createCandidate(formData: FormData) {
  const supabase = await createClient();
  const serviceClient = createServiceRoleClient();

  const result = await createOneCandidate(supabase, serviceClient, {
    full_name: String(formData.get("full_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? ""),
    application_id: String(formData.get("application_id") ?? ""),
  });

  if (!result.ok) toRedirect(`${result.email || "Candidate"}: ${result.reason}`);

  revalidatePath("/admin/candidates");
  redirect("/admin/candidates?created=1");
}

/**
 * Bulk import: one candidate per line, comma-separated —
 * full_name,email,phone,password[,application_id]
 * Runs each line independently so one bad row doesn't block the rest;
 * reports how many succeeded/failed back on the candidates page.
 */
export async function bulkCreateCandidates(formData: FormData) {
  const supabase = await createClient();
  const serviceClient = createServiceRoleClient();

  const raw = String(formData.get("rows") ?? "");
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let success = 0;
  const failures: string[] = [];

  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim());
    const [full_name, email, phone, password, application_id] = parts;

    if (!full_name || !email || !password) {
      failures.push(`"${line}": expected full_name,email,phone,password`);
      continue;
    }

    const result = await createOneCandidate(supabase, serviceClient, {
      full_name,
      email,
      phone,
      password,
      application_id,
    });

    if (result.ok) success += 1;
    else failures.push(`${result.email}: ${result.reason}`);
  }

  revalidatePath("/admin/candidates");

  const params = new URLSearchParams();
  params.set("bulk_success", String(success));
  if (failures.length) params.set("bulk_failures", failures.slice(0, 5).join(" | "));
  redirect(`/admin/candidates?${params.toString()}`);
}

export async function setCandidateActive(candidateId: string, isActive: boolean) {
  const supabase = await createClient();
  await supabase.from("candidates").update({ is_active: isActive }).eq("id", candidateId);
  revalidatePath("/admin/candidates");
  redirect("/admin/candidates");
}
