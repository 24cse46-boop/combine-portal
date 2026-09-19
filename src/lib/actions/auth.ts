"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = { error: string | null };

/**
 * Candidate login (Section 6). On success, redirects to /dashboard, or to
 * /change-password if the candidate is still on a temporary password —
 * the redirect target is decided by the dashboard/middleware, not here,
 * so this action stays a thin wrapper around Supabase Auth.
 */
export async function candidateLogin(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Incorrect email or password." };
  }

  redirect("/dashboard");
}

/**
 * Admin login. Verifies the authenticated user also has an active row in
 * admin_users — a candidate account cannot sign in through this form.
 */
export async function adminLogin(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Incorrect email or password." };
  }

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id, is_active")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (!adminRow || !adminRow.is_active) {
    await supabase.auth.signOut();
    return { error: "This account is not authorized for admin access." };
  }

  redirect("/admin/dashboard");
}

export async function changePassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Your session has expired. Please log in again." };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    return { error: "Could not update your password. Try again." };
  }

  await supabase
    .from("candidates")
    .update({ must_change_password: false })
    .eq("auth_user_id", userData.user.id);

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function adminSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
