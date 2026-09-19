"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

function toRedirect(error: string): never {
  redirect(`/admin/settings?error=${encodeURIComponent(error)}`);
}

/**
 * Creates a brand-new admin: a confirmed Supabase Auth user (via the
 * service role's admin API — this is the one place in the app that's
 * allowed to create logins) plus the matching `admin_users` row. Lets an
 * existing admin onboard a colleague entirely from the UI, no dashboard
 * trip required.
 */
export async function createAdmin(formData: FormData) {
  const supabase = await createClient();

  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!full_name || !email) toRedirect("Name and email are required.");
  if (password.length < 8) toRedirect("Password must be at least 8 characters.");

  const serviceClient = createServiceRoleClient();
  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    toRedirect(createError?.message ?? "Could not create the account.");
  }

  const { error: insertError } = await supabase.from("admin_users").insert({
    auth_user_id: created.user.id,
    full_name,
    email,
  });

  if (insertError) {
    // Roll back the auth user so we don't leave an orphaned login with no
    // admin_users row (which would otherwise just fail silently at login).
    await serviceClient.auth.admin.deleteUser(created.user.id);
    toRedirect("Could not save the admin record. The account was not created.");
  }

  revalidatePath("/admin/settings");
  redirect("/admin/settings?created=1");
}

export async function setAdminActive(adminId: string, isActive: boolean) {
  const supabase = await createClient();
  await supabase.from("admin_users").update({ is_active: isActive }).eq("id", adminId);
  revalidatePath("/admin/settings");
  redirect("/admin/settings");
}
