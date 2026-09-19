import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { upsertInterview } from "@/lib/actions/interviews";
import { Button, Field, Panel, Select, StatusPill, TextInput, Textarea } from "@/components/ui";

function toLocalInputValue(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export default async function InterviewDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ candidateId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { candidateId } = await params;
  const { saved } = await searchParams;
  const supabase = await createClient();

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, full_name, email")
    .eq("id", candidateId)
    .maybeSingle();

  if (!candidate) {
    return (
      <div className="px-8 py-8">
        <p className="text-sm text-ink-muted">Candidate not found.</p>
      </div>
    );
  }

  const { data: interview } = await supabase
    .from("interviews")
    .select("status, scheduled_at, method_or_location, notes")
    .eq("candidate_id", candidateId)
    .maybeSingle();

  const { data: results } = await supabase
    .from("results")
    .select("total_score, final_status, attempt:attempts!inner(candidate_id, test:tests(name))")
    .eq("attempt.candidate_id", candidateId);

  return (
    <div className="px-8 py-8 max-w-2xl">
      <Link href="/admin/interviews" className="text-xs text-teal hover:underline">
        ← All interviews
      </Link>
      <h1 className="font-display text-xl font-semibold mt-1 mb-1">{candidate.full_name}</h1>
      <p className="text-sm text-ink-muted mb-8">{candidate.email}</p>

      {results && results.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-8">
          {results.map((r, i) => {
            const test = (r.attempt as unknown as { test: { name: string } } | null)?.test;
            return (
              <StatusPill key={i}>
                {test?.name}: {r.total_score} pts · {r.final_status}
              </StatusPill>
            );
          })}
        </div>
      ) : null}

      {saved ? (
        <p className="border border-success bg-success-bg px-4 py-2.5 text-sm text-success mb-6">
          Saved.
        </p>
      ) : null}

      <Panel className="p-8">
        <form action={upsertInterview.bind(null, candidateId)} className="flex flex-col gap-6">
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={interview?.status ?? "not_scheduled"}>
              <option value="not_scheduled">Not scheduled</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="under_review">Under review</option>
              <option value="finalized">Finalized</option>
            </Select>
          </Field>
          <Field label="Date & time" htmlFor="scheduled_at">
            <TextInput
              id="scheduled_at"
              name="scheduled_at"
              type="datetime-local"
              defaultValue={toLocalInputValue(interview?.scheduled_at)}
            />
          </Field>
          <Field label="Method / location" htmlFor="method_or_location" hint="e.g. Google Meet link, or office address">
            <TextInput
              id="method_or_location"
              name="method_or_location"
              defaultValue={interview?.method_or_location ?? ""}
            />
          </Field>
          <Field label="Notes" htmlFor="notes" hint="Internal only — never shown to the candidate">
            <Textarea id="notes" name="notes" rows={4} defaultValue={interview?.notes ?? ""} />
          </Field>
          <Button type="submit" className="self-start">
            Save
          </Button>
        </form>
      </Panel>
    </div>
  );
}
