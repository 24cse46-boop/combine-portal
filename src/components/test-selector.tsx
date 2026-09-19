"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui";

export function TestSelector({
  tests,
  selectedTestId,
}: {
  tests: { id: string; name: string }[];
  selectedTestId?: string;
}) {
  const router = useRouter();

  return (
    <Select
      defaultValue={selectedTestId ?? ""}
      onChange={(e) => router.push(`/admin/assignments?test=${e.target.value}`)}
      className="max-w-sm"
    >
      <option value="" disabled>
        Select a test…
      </option>
      {tests.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </Select>
  );
}
