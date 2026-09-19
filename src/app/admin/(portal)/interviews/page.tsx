/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Panel, StatusPill } from "@/components/ui";

const tone: Record<string, "neutral" | "success" | "danger" | "amber"> = {
  not_scheduled: "neutral",
  scheduled: "amber",
  completed: "amber",
  under_review: "amber",
  finalized: "success",
};

export default async function AdminInterviewsPage() {
  const supabase = await createClient();

  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, full_name, email")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  const { data: interviews } = await supabase
    .from("interviews")
    .select("candidate_id, status, scheduled_at");

  const byCandidate = new Map((interviews ?? []).map((i: any) => [i.candidate_id, i]));

  return (
    <div className="px-8 py-8">
      <h1 className="font-display text-xl font-semibold mb-1">Interviews</h1>
      <p className="text-sm text-ink-muted mb-8">
        Schedule and track interview status for each candidate.
      </p>

      <Panel>
        {!candidates || candidates.length === 0 ? (
          <p className="px-5 py-8 text-sm text-ink-muted text-center">No candidates yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-ink-muted">
                <th className="px-5 py-3 font-medium">Candidate</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const interview = byCandidate.get(c.id);
                const status = interview?.status ?? "not_scheduled";
                return (
                  <tr key={c.id} className="border-b border-hairline last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/admin/interviews/${c.id}`} className="text-teal hover:underline">
                        {c.full_name}
                      </Link>
                      <p className="text-xs text-ink-muted">{c.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill tone={tone[status] ?? "neutral"}>{status.replace("_", " ")}</StatusPill>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">
                      {interview?.scheduled_at
                        ? new Date(interview.scheduled_at).toLocaleString("en-GB", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
