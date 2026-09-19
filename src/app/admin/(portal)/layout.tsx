import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin-sidebar";

export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/admin/login");

  const { data: admin } = await supabase
    .from("admin_users")
    .select("full_name, is_active")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  if (!admin || !admin.is_active) redirect("/admin/login");

  return (
    <div className="flex">
      <AdminSidebar adminName={admin.full_name} />
      <div className="flex-1 min-h-screen">{children}</div>
    </div>
  );
}
