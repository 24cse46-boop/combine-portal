import { createClient } from "@/lib/supabase/server";
import { Panel, StatusPill } from "@/components/ui";

export default async function AdminCandidatesPage() {
  const supabase = await createClient();
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, full_name, email, application_id, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="px-8 py-8">
      <h1 className="font-display text-xl font-semibold mb-1">Candidates</h1>
      <p className="text-sm text-ink-muted mb-8">
        Candidates synced from the external Google Form pipeline. Assignment, notes,
        and attempt history are added in Phase 2.
      </p>

      <Panel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-ink-muted">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Application ID</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {!candidates || candidates.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-ink-muted">
                  No candidates yet.
                </td>
              </tr>
            ) : (
              candidates.map((c) => (
                <tr key={c.id} className="border-b border-hairline last:border-0">
                  <td className="px-5 py-3">{c.full_name}</td>
                  <td className="px-5 py-3 text-ink-muted">{c.email}</td>
                  <td className="px-5 py-3 text-ink-muted">{c.application_id ?? "—"}</td>
                  <td className="px-5 py-3">
                    <StatusPill tone={c.is_active ? "success" : "neutral"}>
                      {c.is_active ? "active" : "inactive"}
                    </StatusPill>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
