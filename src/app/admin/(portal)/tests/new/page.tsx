import { createTest } from "@/lib/actions/tests";
import { TestConfigFields } from "@/components/test-config-fields";
import { Button, ErrorNote, Panel } from "@/components/ui";

export default async function NewTestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="px-8 py-8 max-w-2xl">
      <h1 className="font-display text-xl font-semibold mb-1">New test</h1>
      <p className="text-sm text-ink-muted mb-8">
        Created as a draft — nothing is visible to candidates until you schedule it.
      </p>

      <ErrorNote message={error} />

      <Panel className="p-8">
        <form action={createTest} className="flex flex-col gap-8">
          <TestConfigFields />
          <Button type="submit" className="self-start">
            Create test
          </Button>
        </form>
      </Panel>
    </div>
  );
}
