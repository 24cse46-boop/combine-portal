/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { Panel, StatusPill } from "@/components/ui";

const typeLabel: Record<string, string> = {
  tab_switch: "Tab switch",
  fullscreen_exit: "Fullscreen exit",
  refresh: "Refresh / close",
  copy: "Copy",
  paste: "Paste",
  right_click: "Right-click",
  text_selection: "Text selection",
  back_navigation: "Back navigation",
  other: "Other",
};

export default async function AdminViolationsPage() {
  const supabase = await createClient();

  const { data: violations } = await supabase
    .from("violations")
    .select(
      "id, type, detail, occurred_at, attempt:attempts(id, status, candidate:candidates(full_name, email), test:tests(name))"
    )
    .order("occurred_at", { ascending: false })
    .limit(100);

  return (
    <div className="px-8 py-8">
      <h1 className="font-display text-xl font-semibold mb-1">Violations</h1>
      <p className="text-sm text-ink-muted mb-8">
        The last 100 integrity events across all attempts, most recent first.
      </p>

      <Panel>
        {!violations || violations.length === 0 ? (
          <p className="px-5 py-8 text-sm text-ink-muted text-center">
            No integrity events logged yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-ink-muted">
                <th className="px-5 py-3 font-medium">Candidate</th>
                <th className="px-5 py-3 font-medium">Test</th>
                <th className="px-5 py-3 font-medium">Event</th>
                <th className="px-5 py-3 font-medium">Attempt status</th>
                <th className="px-5 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((v: any) => (
                <tr key={v.id} className="border-b border-hairline last:border-0">
                  <td className="px-5 py-3">
                    <p>{v.attempt?.candidate?.full_name ?? "—"}</p>
                    <p className="text-xs text-ink-muted">{v.attempt?.candidate?.email}</p>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{v.attempt?.test?.name}</td>
                  <td className="px-5 py-3">
                    <StatusPill tone="danger">{typeLabel[v.type] ?? v.type}</StatusPill>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{v.attempt?.status}</td>
                  <td className="px-5 py-3 text-ink-muted">
                    {new Date(v.occurred_at).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
