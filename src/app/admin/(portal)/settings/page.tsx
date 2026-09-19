import { createClient } from "@/lib/supabase/server";
import { createAdmin, setAdminActive } from "@/lib/actions/admin-roster";
import { Button, ErrorNote, Field, Panel, StatusPill, TextInput } from "@/components/ui";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { error, created } = await searchParams;
  const supabase = await createClient();

  const { data: admins } = await supabase
    .from("admin_users")
    .select("id, full_name, email, is_active")
    .order("created_at", { ascending: true });

  return (
    <div className="px-8 py-8 max-w-2xl">
      <h1 className="font-display text-xl font-semibold mb-1">Settings</h1>
      <p className="text-sm text-ink-muted mb-8">Manage who has admin access to this portal.</p>

      <ErrorNote message={error} />
      {created ? (
        <p className="border border-success bg-success-bg px-4 py-2.5 text-sm text-success mb-6">
          Admin account created.
        </p>
      ) : null}

      <section className="mb-10">
        <h2 className="text-sm font-medium mb-4">Admin roster</h2>
        <Panel>
          {!admins || admins.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-muted text-center">No admins yet.</p>
          ) : (
            <ul>
              {admins.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between px-5 py-3 border-b border-hairline last:border-0"
                >
                  <div>
                    <p className="text-sm">{a.full_name}</p>
                    <p className="text-xs text-ink-muted">{a.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill tone={a.is_active ? "success" : "neutral"}>
                      {a.is_active ? "active" : "inactive"}
                    </StatusPill>
                    <form action={setAdminActive.bind(null, a.id, !a.is_active)}>
                      <Button type="submit" variant="ghost">
                        {a.is_active ? "Deactivate" : "Reactivate"}
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-4">Add an admin</h2>
        <Panel className="p-6">
          <form action={createAdmin} className="flex flex-col gap-5">
            <Field label="Full name" htmlFor="full_name">
              <TextInput id="full_name" name="full_name" required />
            </Field>
            <Field label="Email" htmlFor="email">
              <TextInput id="email" name="email" type="email" required />
            </Field>
            <Field label="Temporary password" htmlFor="password" hint="At least 8 characters. Share it with them securely.">
              <TextInput id="password" name="password" type="text" minLength={8} required />
            </Field>
            <Button type="submit" className="self-start">
              Create admin account
            </Button>
          </form>
        </Panel>
      </section>
    </div>
  );
}
