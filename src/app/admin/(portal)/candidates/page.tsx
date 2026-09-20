import { createClient } from "@/lib/supabase/server";
import { bulkCreateCandidates, createCandidate, setCandidateActive } from "@/lib/actions/candidates";
import { Button, ErrorNote, Field, Panel, StatusPill, TextInput, Textarea } from "@/components/ui";

export default async function AdminCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; bulk_success?: string; bulk_failures?: string }>;
}) {
  const { error, created, bulk_success, bulk_failures } = await searchParams;
  const supabase = await createClient();
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, full_name, email, application_id, is_active, must_change_password, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="px-8 py-8 max-w-3xl">
      <h1 className="font-display text-xl font-semibold mb-1">Candidates</h1>
      <p className="text-sm text-ink-muted mb-8">
        Add candidates with a login (email + password) below, then assign them to a test
        from the Assignments page.
      </p>

      <ErrorNote message={error} />
      {created ? (
        <p className="border border-success bg-success-bg px-4 py-2.5 text-sm text-success mb-6">
          Candidate created.
        </p>
      ) : null}
      {bulk_success ? (
        <p className="border border-success bg-success-bg px-4 py-2.5 text-sm text-success mb-2">
          {bulk_success} candidate(s) created.
        </p>
      ) : null}
      {bulk_failures ? (
        <p className="border border-danger bg-danger-bg px-4 py-2.5 text-sm text-danger mb-6 whitespace-pre-wrap">
          Some rows failed: {bulk_failures}
        </p>
      ) : null}

      <section className="mb-10">
        <h2 className="text-sm font-medium mb-4">Add one candidate</h2>
        <Panel className="p-6">
          <form action={createCandidate} className="grid grid-cols-2 gap-4">
            <Field label="Full name" htmlFor="full_name">
              <TextInput id="full_name" name="full_name" required />
            </Field>
            <Field label="Email" htmlFor="email">
              <TextInput id="email" name="email" type="email" required />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <TextInput id="phone" name="phone" />
            </Field>
            <Field label="Password" htmlFor="password" hint="e.g. their phone number — they'll be asked to change it on first login">
              <TextInput id="password" name="password" minLength={6} required />
            </Field>
            <Field label="Application ID" htmlFor="application_id" hint="Optional — from your Google Form/Sheet">
              <TextInput id="application_id" name="application_id" />
            </Field>
            <div className="col-span-2">
              <Button type="submit">Create candidate</Button>
            </div>
          </form>
        </Panel>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-medium mb-4">Bulk add</h2>
        <Panel className="p-6">
          <form action={bulkCreateCandidates} className="flex flex-col gap-4">
            <Field
              label="One candidate per line"
              htmlFor="rows"
              hint="Format: full_name,email,phone,password  (application_id optional as a 5th field)"
            >
              <Textarea
                id="rows"
                name="rows"
                rows={6}
                placeholder={"Ayesha Khan,ayesha@example.com,03001234567,03001234567\nBilal Ahmed,bilal@example.com,03211234567,03211234567"}
                required
              />
            </Field>
            <Button type="submit" variant="secondary" className="self-start">
              Import candidates
            </Button>
          </form>
        </Panel>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-4">All candidates ({candidates?.length ?? 0})</h2>
        <Panel>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-ink-muted">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium" />
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
                    <td className="px-5 py-3">
                      <StatusPill tone={c.is_active ? "success" : "neutral"}>
                        {c.is_active ? "active" : "inactive"}
                      </StatusPill>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <form action={setCandidateActive.bind(null, c.id, !c.is_active)}>
                        <Button type="submit" variant="ghost">
                          {c.is_active ? "Deactivate" : "Reactivate"}
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Panel>
      </section>
    </div>
  );
}
