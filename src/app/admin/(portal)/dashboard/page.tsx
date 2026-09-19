import { createClient } from "@/lib/supabase/server";
import { Panel } from "@/components/ui";

// Supabase's query-builder generic chain doesn't have a convenient exported
// type for "any filterable query on any table", so this narrow helper's
// callback stays loosely typed on purpose rather than fighting the client's
// generics here.
/* eslint-disable @typescript-eslint/no-explicit-any */
async function countRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  filter?: (q: any) => any
) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (filter) query = filter(query);
  const { count } = await query;
  return count ?? 0;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    candidates,
    scheduled,
    testing,
    completed,
    underReview,
    interviews,
    finalized,
    flagged,
  ] = await Promise.all([
    countRows(supabase, "candidates"),
    countRows(supabase, "tests", (q) => q.eq("status", "scheduled")),
    countRows(supabase, "attempts", (q) => q.eq("status", "in_progress")),
    countRows(supabase, "attempts", (q) =>
      q.in("status", ["submitted", "auto_submitted"])
    ),
    countRows(supabase, "results", (q) => q.eq("review_status", "under_review")),
    countRows(supabase, "interviews", (q) => q.eq("status", "scheduled")),
    countRows(supabase, "results", (q) => q.eq("review_status", "completed")),
    countRows(supabase, "attempts", (q) => q.eq("status", "flagged")),
  ]);

  const cards = [
    { label: "Candidates", value: candidates },
    { label: "Scheduled tests", value: scheduled },
    { label: "In progress", value: testing },
    { label: "Completed", value: completed },
    { label: "Under review", value: underReview },
    { label: "Interviews scheduled", value: interviews },
    { label: "Finalized", value: finalized },
    { label: "Flagged", value: flagged },
  ];

  return (
    <div className="px-8 py-8">
      <h1 className="font-display text-xl font-semibold mb-1">Overview</h1>
      <p className="text-sm text-ink-muted mb-8">
        Snapshot of the candidate pipeline across every test.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-hairline border border-hairline">
        {cards.map((card) => (
          <Panel key={card.label} className="border-0 p-5">
            <p className="text-2xl font-display font-semibold">{card.value}</p>
            <p className="text-xs text-ink-muted mt-1">{card.label}</p>
          </Panel>
        ))}
      </div>
    </div>
  );
}
