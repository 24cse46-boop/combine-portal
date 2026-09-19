// Joined Supabase selects (candidate:candidates(...)) don't have a generated
// row type in this project yet, so the two spots that read the joined shape
// stay loosely typed rather than hand-rolling a partial schema type.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { assignCandidateToTest, setAssignmentActive } from "@/lib/actions/assignments";
import { TestSelector } from "@/components/test-selector";
import { Button, ErrorNote, Panel, Select, StatusPill } from "@/components/ui";

export default async function AdminAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ test?: string; error?: string }>;
}) {
  const { test: testId, error } = await searchParams;
  const supabase = await createClient();

  const { data: tests } = await supabase
    .from("tests")
    .select("id, name")
    .order("created_at", { ascending: false });

  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, full_name, email")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  const { data: assignments } = testId
    ? await supabase
        .from("test_assignments")
        .select("id, is_active, candidate:candidates(id, full_name, email)")
        .eq("test_id", testId)
    : { data: [] };

  const assignedCandidateIds = new Set((assignments ?? []).map((a: any) => a.candidate?.id));
  const unassigned = (candidates ?? []).filter((c) => !assignedCandidateIds.has(c.id));

  return (
    <div className="px-8 py-8 max-w-2xl">
      <h1 className="font-display text-xl font-semibold mb-1">Assignments</h1>
      <p className="text-sm text-ink-muted mb-8">
        Pick a test, then assign candidates to it. Candidates only see a test once assigned.
      </p>

      <ErrorNote message={error} />

      <TestSelector tests={tests ?? []} selectedTestId={testId} />

      {!testId ? (
        <p className="text-sm text-ink-muted mt-8">Select a test above to manage its assignments.</p>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          <section>
            <h2 className="text-sm font-medium mb-4">Assigned candidates</h2>
            <Panel>
              {!assignments || assignments.length === 0 ? (
                <p className="px-5 py-6 text-sm text-ink-muted text-center">
                  No candidates assigned yet.
                </p>
              ) : (
                <ul>
                  {assignments.map((a: any) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between px-5 py-3 border-b border-hairline last:border-0"
                    >
                      <div>
                        <p className="text-sm">{a.candidate?.full_name}</p>
                        <p className="text-xs text-ink-muted">{a.candidate?.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusPill tone={a.is_active ? "success" : "neutral"}>
                          {a.is_active ? "active" : "inactive"}
                        </StatusPill>
                        <form action={setAssignmentActive.bind(null, a.id, !a.is_active, testId)}>
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
            <h2 className="text-sm font-medium mb-4">Assign a candidate</h2>
            {unassigned.length === 0 ? (
              <p className="text-sm text-ink-muted">Every active candidate is already assigned.</p>
            ) : (
              <Panel className="p-5">
                <form action={assignCandidateToTest} className="flex gap-3">
                  <input type="hidden" name="test_id" value={testId} />
                  <Select name="candidate_id" required defaultValue="" className="flex-1">
                    <option value="" disabled>
                      Select a candidate…
                    </option>
                    {unassigned.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} — {c.email}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit">Assign</Button>
                </form>
              </Panel>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
