import { ErrorNote, Panel } from "@/components/ui";
import { NewQuestionForm } from "@/components/new-question-form";

export default async function NewQuestionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="px-8 py-8 max-w-2xl">
      <h1 className="font-display text-xl font-semibold mb-1">New question</h1>
      <p className="text-sm text-ink-muted mb-8">
        Added to the shared question bank — attach it to any test afterwards.
      </p>

      <ErrorNote message={error} />

      <Panel className="p-8">
        <NewQuestionForm />
      </Panel>
    </div>
  );
}
