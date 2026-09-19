/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { forceSubmitAttempt } from "@/lib/actions/admin-attempts";
import { Button, Panel, StatusPill } from "@/components/ui";

function elapsedLabel(startedAt: string | null) {
  if (!startedAt) return "—";
  const ms = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export default async function AdminAttemptsPage() {
  const supabase = await createClient();

  const { data: inProgress } = await supabase
    .from("attempts")
    .select("id, status, current_question_index, started_at, question_order, candidate:candidates(full_name, email), test:tests(id, name)")
    .eq("status", "in_progress")
    .order("started_at", { ascending: false });

  const { data: recent } = await supabase
    .from("attempts")
    .select("id, status, submitted_at, candidate:candidates(full_name, email), test:tests(id, name)")
    .in("status", ["submitted", "auto_submitted", "flagged"])
    .order("submitted_at", { ascending: false })
    .limit(20);

  const attemptIds = [
    ...(inProgress ?? []).map((a: any) => a.id),
    ...(recent ?? []).map((a: any) => a.id),
  ];

  const { data: violationRows } = attemptIds.length
    ? await supabase.from("violations").select("attempt_id").in("attempt_id", attemptIds)
    : { data: [] };

  const violationCounts = new Map<string, number>();
  (violationRows ?? []).forEach((v: any) => {
    violationCounts.set(v.attempt_id, (violationCounts.get(v.attempt_id) ?? 0) + 1);
  });

  return (
    <div className="px-8 py-8">
      <h1 className="font-display text-xl font-semibold mb-1">Live attempts</h1>
      <p className="text-sm text-ink-muted mb-8">
        Candidates currently taking a test, and the last 20 that finished.
      </p>

      <section className="mb-10">
        <h2 className="text-sm font-medium mb-4">In progress ({inProgress?.length ?? 0})</h2>
        <Panel>
          {!inProgress || inProgress.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-muted text-center">No one is testing right now.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-ink-muted">
                  <th className="px-5 py-3 font-medium">Candidate</th>
                  <th className="px-5 py-3 font-medium">Test</th>
                  <th className="px-5 py-3 font-medium">Progress</th>
                  <th className="px-5 py-3 font-medium">Violations</th>
                  <th className="px-5 py-3 font-medium">Started</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {inProgress.map((a: any) => {
                  const total = (a.question_order as string[] | null)?.length ?? 0;
                  const vCount = violationCounts.get(a.id) ?? 0;
                  return (
                    <tr key={a.id} className="border-b border-hairline last:border-0">
                      <td className="px-5 py-3">
                        <p>{a.candidate?.full_name}</p>
                        <p className="text-xs text-ink-muted">{a.candidate?.email}</p>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{a.test?.name}</td>
                      <td className="px-5 py-3">
                        {Math.min(a.current_question_index + 1, total)} / {total}
                      </td>
                      <td className="px-5 py-3">
                        {vCount > 0 ? <StatusPill tone="danger">{vCount}</StatusPill> : <span className="text-ink-muted">0</span>}
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{elapsedLabel(a.started_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <form action={forceSubmitAttempt.bind(null, a.id)}>
                          <Button type="submit" variant="ghost" className="text-danger">
                            Force submit
                          </Button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-4">Recently finished</h2>
        <Panel>
          {!recent || recent.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-muted text-center">Nothing finished yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-ink-muted">
                  <th className="px-5 py-3 font-medium">Candidate</th>
                  <th className="px-5 py-3 font-medium">Test</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Violations</th>
                  <th className="px-5 py-3 font-medium">Finished</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a: any) => {
                  const vCount = violationCounts.get(a.id) ?? 0;
                  return (
                    <tr key={a.id} className="border-b border-hairline last:border-0">
                      <td className="px-5 py-3">
                        <p>{a.candidate?.full_name}</p>
                        <p className="text-xs text-ink-muted">{a.candidate?.email}</p>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{a.test?.name}</td>
                      <td className="px-5 py-3">
                        <StatusPill tone={a.status === "auto_submitted" ? "amber" : "neutral"}>
                          {a.status}
                        </StatusPill>
                      </td>
                      <td className="px-5 py-3">
                        {vCount > 0 ? <StatusPill tone="danger">{vCount}</StatusPill> : <span className="text-ink-muted">0</span>}
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{elapsedLabel(a.submitted_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      </section>
    </div>
  );
}
