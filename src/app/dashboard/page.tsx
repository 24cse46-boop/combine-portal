import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { Button, Panel, StatusPill } from "@/components/ui";
import { LockedCountdown } from "@/components/locked-countdown";

export default async function CandidateDashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, full_name, must_change_password")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  if (!candidate) redirect("/login");
  if (candidate.must_change_password) redirect("/change-password");

  // Active assignment + the test it points to. Question content itself is
  // never fetched here — only schedule/status, per Section 8 ("direct
  // access... must not expose questions" before start time).
  const { data: assignment } = await supabase
    .from("test_assignments")
    .select("id, test:tests(id, name, description, status, start_at, end_at, time_zone)")
    .eq("candidate_id", candidate.id)
    .eq("is_active", true)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const test = assignment?.test as
    | {
        id: string;
        name: string;
        description: string | null;
        status: string;
        start_at: string | null;
        end_at: string | null;
        time_zone: string;
      }
    | null
    | undefined;

  const { data: attempt } = test
    ? await supabase
        .from("attempts")
        .select("status")
        .eq("test_id", test.id)
        .eq("candidate_id", candidate.id)
        .maybeSingle()
    : { data: null };

  // eslint-disable-next-line react-hooks/purity -- server component: wall-clock read is required to compare against the schedule
  const now = Date.now();
  const windowClosed = test?.end_at ? new Date(test.end_at).getTime() < now : false;
  const withinStart = test?.start_at ? new Date(test.start_at).getTime() <= now : true;

  // Status/date only — RLS blocks candidates from ever reading admin notes
  // on this row, but the query only asks for these two columns anyway.
  const { data: interview } = await supabase
    .from("interviews")
    .select("status, scheduled_at, method_or_location")
    .eq("candidate_id", candidate.id)
    .maybeSingle();

  return (
    <main className="min-h-screen">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs text-ink-muted">Combine Foundation</p>
            <p className="font-display text-lg font-semibold">Volunteer Assessment Portal</p>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-xl font-medium mb-1">Welcome, {candidate.full_name}</h1>
        <p className="text-sm text-ink-muted mb-8">
          Your assessment will appear below once it has been scheduled by an admin.
        </p>

        {!test ? (
          <Panel className="p-8 text-center">
            <p className="text-sm text-ink-muted">
              No assessment has been assigned to you yet. Check back later, or contact
              Combine Foundation if you were expecting one.
            </p>
          </Panel>
        ) : (
          <Panel className="p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-lg font-semibold">{test.name}</h2>
                {test.description ? (
                  <p className="text-sm text-ink-muted mt-1">{test.description}</p>
                ) : null}
              </div>
              <StatusPill tone={test.status === "active" ? "success" : "neutral"}>
                {test.status}
              </StatusPill>
            </div>

            {attempt?.status === "submitted" || attempt?.status === "auto_submitted" ? (
              <div className="border border-hairline p-6 text-center">
                <p className="text-sm text-success mb-1">✓ Submitted</p>
                <p className="text-xs text-ink-muted">
                  Your responses are in. You&apos;ll hear back from Combine Foundation by email.
                </p>
              </div>
            ) : attempt?.status === "in_progress" ? (
              <div className="border border-hairline p-6 text-center">
                <p className="text-sm text-amber-dark mb-4">You have an assessment in progress.</p>
                <Link href={`/assessment/${test.id}`}>
                  <Button>Resume test</Button>
                </Link>
              </div>
            ) : test.status === "scheduled" || (test.status === "active" && !withinStart) ? (
              <div className="border border-hairline p-6 text-center">
                <p className="text-sm text-ink-muted mb-1">🔒 Assessment locked</p>
                {test.start_at ? (
                  <>
                    <p className="text-sm mb-4">
                      Opens{" "}
                      {new Date(test.start_at).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      ({test.time_zone})
                    </p>
                    <LockedCountdown targetIso={test.start_at} />
                  </>
                ) : (
                  <p className="text-sm">The schedule hasn&apos;t been set yet.</p>
                )}
              </div>
            ) : test.status === "active" && !windowClosed ? (
              <div className="border border-hairline p-6 text-center">
                <p className="text-sm text-success mb-4">Your assessment is open.</p>
                <Link href={`/assessment/${test.id}`}>
                  <Button>Start test</Button>
                </Link>
              </div>
            ) : (
              <div className="border border-hairline p-6 text-center text-sm text-ink-muted">
                {windowClosed ? "This assessment window has closed." : `This assessment is currently ${test.status}.`}
              </div>
            )}
          </Panel>
        )}

        {interview && interview.status !== "not_scheduled" ? (
          <Panel className="p-8 mt-6">
            <h2 className="font-display text-lg font-semibold mb-1">Interview</h2>
            <p className="text-sm text-ink-muted mb-1">Status: {interview.status.replace("_", " ")}</p>
            {interview.scheduled_at ? (
              <p className="text-sm text-ink-muted mb-1">
                {new Date(interview.scheduled_at).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            ) : null}
            {interview.method_or_location ? (
              <p className="text-sm text-ink-muted">{interview.method_or_location}</p>
            ) : null}
          </Panel>
        ) : null}
      </div>
    </main>
  );
}
