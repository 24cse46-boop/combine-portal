import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button, Panel, StatusPill } from "@/components/ui";

const statusTone: Record<string, "neutral" | "success" | "danger" | "amber"> = {
  draft: "neutral",
  scheduled: "amber",
  active: "success",
  paused: "amber",
  closed: "neutral",
  archived: "neutral",
};

export default async function AdminTestsPage() {
  const supabase = await createClient();
  const { data: tests } = await supabase
    .from("tests")
    .select("id, name, status, start_at, end_at, time_zone")
    .order("created_at", { ascending: false });

  return (
    <div className="px-8 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-xl font-semibold mb-1">Tests</h1>
          <p className="text-sm text-ink-muted">
            Create and schedule assessments, then assign candidates.
          </p>
        </div>
        <Link href="/admin/tests/new">
          <Button>New test</Button>
        </Link>
      </div>

      <Panel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-ink-muted">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Window</th>
            </tr>
          </thead>
          <tbody>
            {!tests || tests.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-ink-muted">
                  No tests yet. Create one to get started.
                </td>
              </tr>
            ) : (
              tests.map((t) => (
                <tr key={t.id} className="border-b border-hairline last:border-0">
                  <td className="px-5 py-3">
                    <Link href={`/admin/tests/${t.id}`} className="text-teal hover:underline">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill tone={statusTone[t.status] ?? "neutral"}>{t.status}</StatusPill>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">
                    {t.start_at
                      ? `${new Date(t.start_at).toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })} (${t.time_zone})`
                      : "Not scheduled"}
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
