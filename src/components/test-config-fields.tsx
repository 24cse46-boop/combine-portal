import { Checkbox, Field, Select, TextInput, Textarea } from "@/components/ui";

type TestDefaults = {
  name?: string;
  description?: string | null;
  time_zone?: string;
  start_at?: string | null;
  end_at?: string | null;
  attempt_limit?: number;
  max_violations?: number;
  warn_after_violations?: number;
  randomize_questions?: boolean;
  randomize_options?: boolean;
  sequential_navigation?: boolean;
  require_fullscreen?: boolean;
  disable_copy_paste?: boolean;
  disable_right_click?: boolean;
  disable_back_navigation?: boolean;
};

function toLocalInputValue(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function TestConfigFields({ defaults = {} }: { defaults?: TestDefaults }) {
  return (
    <div className="flex flex-col gap-6">
      <Field label="Test name" htmlFor="name">
        <TextInput id="name" name="name" required defaultValue={defaults.name} />
      </Field>

      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" rows={3} defaultValue={defaults.description ?? ""} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start" htmlFor="start_at" hint="Locked card + countdown show until this moment.">
          <TextInput
            id="start_at"
            name="start_at"
            type="datetime-local"
            defaultValue={toLocalInputValue(defaults.start_at)}
          />
        </Field>
        <Field label="End" htmlFor="end_at" hint="Assessment auto-closes at this moment.">
          <TextInput
            id="end_at"
            name="end_at"
            type="datetime-local"
            defaultValue={toLocalInputValue(defaults.end_at)}
          />
        </Field>
      </div>

      <Field label="Time zone" htmlFor="time_zone">
        <Select id="time_zone" name="time_zone" defaultValue={defaults.time_zone ?? "Asia/Karachi"}>
          <option value="Asia/Karachi">Asia/Karachi</option>
          <option value="UTC">UTC</option>
          <option value="Asia/Dubai">Asia/Dubai</option>
          <option value="Europe/London">Europe/London</option>
          <option value="America/New_York">America/New_York</option>
        </Select>
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Attempt limit" htmlFor="attempt_limit">
          <TextInput
            id="attempt_limit"
            name="attempt_limit"
            type="number"
            min={1}
            defaultValue={defaults.attempt_limit ?? 1}
          />
        </Field>
        <Field label="Warn after" htmlFor="warn_after_violations" hint="violations">
          <TextInput
            id="warn_after_violations"
            name="warn_after_violations"
            type="number"
            min={0}
            defaultValue={defaults.warn_after_violations ?? 1}
          />
        </Field>
        <Field label="Auto-submit after" htmlFor="max_violations" hint="violations">
          <TextInput
            id="max_violations"
            name="max_violations"
            type="number"
            min={1}
            defaultValue={defaults.max_violations ?? 3}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-3 border-t border-hairline pt-5">
        <p className="text-sm font-medium">Behaviour</p>
        <Checkbox
          label="Sequential navigation (candidates cannot go back)"
          name="sequential_navigation"
          defaultChecked={defaults.sequential_navigation ?? true}
        />
        <Checkbox
          label="Randomize question order"
          name="randomize_questions"
          defaultChecked={defaults.randomize_questions ?? false}
        />
        <Checkbox
          label="Randomize option order"
          name="randomize_options"
          defaultChecked={defaults.randomize_options ?? false}
        />
        <Checkbox
          label="Require fullscreen"
          name="require_fullscreen"
          defaultChecked={defaults.require_fullscreen ?? true}
        />
        <Checkbox
          label="Disable copy / paste"
          name="disable_copy_paste"
          defaultChecked={defaults.disable_copy_paste ?? false}
        />
        <Checkbox
          label="Disable right-click"
          name="disable_right_click"
          defaultChecked={defaults.disable_right_click ?? false}
        />
        <Checkbox
          label="Disable back navigation"
          name="disable_back_navigation"
          defaultChecked={defaults.disable_back_navigation ?? true}
        />
      </div>
    </div>
  );
}
