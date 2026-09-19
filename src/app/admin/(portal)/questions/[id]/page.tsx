import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  addOption,
  deleteOption,
  deleteQuestion,
  setCorrectOption,
  updateQuestionMeta,
} from "@/lib/actions/questions";
import { Button, ErrorNote, Field, Panel, StatusPill, TextInput, Textarea } from "@/components/ui";

export default async function QuestionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const supabase = await createClient();

  const { data: question } = await supabase.from("questions").select("*").eq("id", id).maybeSingle();
  if (!question) {
    return (
      <div className="px-8 py-8">
        <p className="text-sm text-ink-muted">Question not found.</p>
      </div>
    );
  }

  const { data: options } = await supabase
    .from("question_options")
    .select("id, option_text, is_correct, sort_order")
    .eq("question_id", id)
    .order("sort_order", { ascending: true });

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-xl font-semibold">Edit question</h1>
        <StatusPill>{question.type === "mcq" ? "MCQ" : "Short answer"}</StatusPill>
      </div>
      <Link href="/admin/questions" className="text-xs text-teal hover:underline">
        ← All questions
      </Link>

      <ErrorNote message={error} />
      {saved ? (
        <p className="border border-success bg-success-bg px-4 py-2.5 text-sm text-success mb-6 mt-6">
          Changes saved.
        </p>
      ) : null}

      <Panel className="p-8 mt-8">
        <form action={updateQuestionMeta.bind(null, id)} className="flex flex-col gap-6">
          <Field label="Question text" htmlFor="prompt">
            <Textarea id="prompt" name="prompt" rows={3} defaultValue={question.prompt} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Default marks" htmlFor="default_marks">
              <TextInput
                id="default_marks"
                name="default_marks"
                type="number"
                min={0}
                step="0.5"
                defaultValue={question.default_marks}
              />
            </Field>
            <Field label="Default timer (seconds)" htmlFor="default_time_seconds">
              <TextInput
                id="default_time_seconds"
                name="default_time_seconds"
                type="number"
                min={5}
                defaultValue={question.default_time_seconds}
              />
            </Field>
          </div>
          <Button type="submit" className="self-start">
            Save changes
          </Button>
        </form>
      </Panel>

      {question.type === "mcq" ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium mb-4">Options</h2>
          <Panel className="mb-4">
            {!options || options.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-muted text-center">No options yet.</p>
            ) : (
              <ul>
                {options.map((opt) => (
                  <li
                    key={opt.id}
                    className="flex items-center gap-3 px-5 py-3 border-b border-hairline last:border-0"
                  >
                    <form action={setCorrectOption.bind(null, id, opt.id)}>
                      <button
                        type="submit"
                        title="Mark as correct"
                        className={
                          opt.is_correct
                            ? "h-4 w-4 rounded-full bg-teal"
                            : "h-4 w-4 rounded-full border border-hairline"
                        }
                        aria-label={opt.is_correct ? "Correct option" : "Mark as correct"}
                      />
                    </form>
                    <span className="flex-1 text-sm">{opt.option_text}</span>
                    {opt.is_correct ? <StatusPill tone="success">correct</StatusPill> : null}
                    <form action={deleteOption.bind(null, id, opt.id)}>
                      <Button type="submit" variant="ghost" className="text-danger">
                        Remove
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel className="p-5">
            <form action={addOption.bind(null, id)} className="flex gap-3">
              <TextInput name="option_text" placeholder="New option text" required className="flex-1" />
              <Button type="submit" variant="secondary">
                Add option
              </Button>
            </form>
          </Panel>
        </section>
      ) : null}

      <form action={deleteQuestion.bind(null, id)} className="mt-8">
        <Button type="submit" variant="ghost" className="text-danger">
          Delete question
        </Button>
      </form>
    </div>
  );
}
