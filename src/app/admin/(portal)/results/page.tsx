/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Panel, StatusPill } from "@/components/ui";

const reviewTone: Record<string, "neutral" | "success" | "amber"> = {
  pending: "amber",
  under_review: "amber",
  completed: "success",
};

const finalTone: Record<string, "neutral" | "success" | "danger" | "amber"> = {
  pending: "neutral",
  shortlisted: "amber",
  selected: "success",
  rejected: "danger",
  on_hold: "neutral",
};

export default async function AdminResultsPage() {
  const supabase = await createClient();

  const { data: results } = await supabase
    .from("results")
    .select(
      "id, mcq_score, short_answer_score, total_score, review_status, final_status, attempt:attempts(id, candidate:candidates(full_name, email), test:tests(name))"
    )
    .order("total_score", { ascending: false });

  return (
    <div className="px-8 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-xl font-semibold mb-1">Results</h1>
          <p className="text-sm text-ink-muted">
            MCQ scores are automatic. Short-answer questions need a grade before a result
            counts as reviewed.
          </p>
        </div>
        <a
          href="/api/results/export"
          className="border border-hairline px-5 py-2.5 text-sm font-medium hover:border-teal hover:text-teal"
        >
          Export CSV
        </a>
      </div>

      <Panel>
        {!results || results.length === 0 ? (
          <p className="px-5 py-8 text-sm text-ink-muted text-center">
            No submitted attempts yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-ink-muted">
                <th className="px-5 py-3 font-medium">Candidate</th>
                <th className="px-5 py-3 font-medium">Test</th>
                <th className="px-5 py-3 font-medium">MCQ</th>
                <th className="px-5 py-3 font-medium">Short answer</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Review</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r: any) => (
                <tr key={r.id} className="border-b border-hairline last:border-0">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/results/${r.attempt?.id}`}
                      className="text-teal hover:underline"
                    >
                      {r.attempt?.candidate?.full_name}
                    </Link>
                    <p className="text-xs text-ink-muted">{r.attempt?.candidate?.email}</p>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{r.attempt?.test?.name}</td>
                  <td className="px-5 py-3">{r.mcq_score}</td>
                  <td className="px-5 py-3">{r.short_answer_score}</td>
                  <td className="px-5 py-3 font-medium">{r.total_score}</td>
                  <td className="px-5 py-3">
                    <StatusPill tone={reviewTone[r.review_status] ?? "neutral"}>
                      {r.review_status}
                    </StatusPill>
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill tone={finalTone[r.final_status] ?? "neutral"}>
                      {r.final_status}
                    </StatusPill>
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
