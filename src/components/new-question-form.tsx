"use client";

import { useState } from "react";
import { createQuestion } from "@/lib/actions/questions";
import { Button, Field, Select, TextInput, Textarea } from "@/components/ui";

export function NewQuestionForm() {
  const [type, setType] = useState<"mcq" | "short_answer">("mcq");
  const [options, setOptions] = useState(["", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  return (
    <form action={createQuestion} className="flex flex-col gap-6">
      <Field label="Type" htmlFor="type">
        <Select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as "mcq" | "short_answer")}
        >
          <option value="mcq">Multiple choice</option>
          <option value="short_answer">Short answer</option>
        </Select>
      </Field>

      <Field label="Question text" htmlFor="prompt">
        <Textarea id="prompt" name="prompt" rows={3} required />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Default marks" htmlFor="default_marks">
          <TextInput id="default_marks" name="default_marks" type="number" min={0} step="0.5" defaultValue={1} />
        </Field>
        <Field label="Default timer (seconds)" htmlFor="default_time_seconds">
          <TextInput
            id="default_time_seconds"
            name="default_time_seconds"
            type="number"
            min={5}
            defaultValue={60}
          />
        </Field>
      </div>

      {type === "mcq" ? (
        <div className="flex flex-col gap-3 border-t border-hairline pt-5">
          <p className="text-sm font-medium">Options</p>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                type="radio"
                name="correct_index"
                value={i}
                checked={correctIndex === i}
                onChange={() => setCorrectIndex(i)}
                className="accent-teal"
                aria-label={`Option ${i + 1} is correct`}
              />
              <TextInput
                name="option_text"
                value={opt}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value;
                  setOptions(next);
                }}
                placeholder={`Option ${i + 1}`}
                required
                className="flex-1"
              />
              {options.length > 2 ? (
                <button
                  type="button"
                  className="text-xs text-ink-muted hover:text-danger"
                  onClick={() => {
                    setOptions(options.filter((_, idx) => idx !== i));
                    if (correctIndex >= i) setCorrectIndex(Math.max(0, correctIndex - 1));
                  }}
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          {options.length < 6 ? (
            <button
              type="button"
              className="self-start text-sm text-teal hover:underline"
              onClick={() => setOptions([...options, ""])}
            >
              + Add option
            </button>
          ) : null}
          <p className="text-xs text-ink-muted">Select the radio button next to the correct option.</p>
        </div>
      ) : null}

      <Button type="submit" className="self-start">
        Create question
      </Button>
    </form>
  );
}
