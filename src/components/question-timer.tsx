"use client";

import { useEffect, useRef, useState } from "react";

export function QuestionTimer({
  formId,
  initialRemainingSeconds,
}: {
  formId: string;
  initialRemainingSeconds: number;
}) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil(initialRemainingSeconds)));
  const firedRef = useRef(false);

  useEffect(() => {
    if (remaining <= 0) {
      if (!firedRef.current) {
        firedRef.current = true;
        const form = document.getElementById(formId) as HTMLFormElement | null;
        if (form) {
          const hidden = document.createElement("input");
          hidden.type = "hidden";
          hidden.name = "timed_out";
          hidden.value = "1";
          form.appendChild(hidden);
          // Skip required-field validation — timing out with no answer
          // selected must still advance the candidate to the next question.
          form.noValidate = true;
          form.requestSubmit();
        }
      }
      return;
    }
    const timer = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(timer);
  }, [remaining, formId]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const low = remaining <= 10;

  return (
    <p className={`font-mono text-3xl ${low ? "text-danger" : "text-teal"}`} aria-live="polite">
      {mm}:{ss}
    </p>
  );
}
