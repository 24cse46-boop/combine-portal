import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { finalizeAttemptResult } from "@/lib/results";

const VALID_TYPES = new Set([
  "tab_switch",
  "fullscreen_exit",
  "refresh",
  "copy",
  "paste",
  "right_click",
  "text_selection",
  "back_navigation",
  "other",
]);

export async function POST(request: Request) {
  let body: { attemptId?: string; type?: string; detail?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { attemptId, type, detail } = body;
  if (!attemptId || !type || !VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid violation" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (!candidate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, test_id, candidate_id, status")
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt || attempt.candidate_id !== candidate.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Already finished — nothing to log or enforce, avoid noisy inserts from
  // a stray unload event firing after submission.
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  await supabase.from("violations").insert({
    attempt_id: attemptId,
    type,
    detail: detail?.slice(0, 500) ?? null,
  });

  const { data: test } = await supabase
    .from("tests")
    .select("max_violations, warn_after_violations")
    .eq("id", attempt.test_id)
    .maybeSingle();

  const { count } = await supabase
    .from("violations")
    .select("id", { count: "exact", head: true })
    .eq("attempt_id", attemptId);

  const violationCount = count ?? 0;
  const maxViolations = test?.max_violations ?? 3;
  const warnAfter = test?.warn_after_violations ?? 1;

  let autoSubmitted = false;
  if (violationCount >= maxViolations) {
    await supabase
      .from("attempts")
      .update({ status: "auto_submitted", submitted_at: new Date().toISOString() })
      .eq("id", attemptId);
    await finalizeAttemptResult(attemptId);
    autoSubmitted = true;
  }

  return NextResponse.json({
    ok: true,
    violationCount,
    maxViolations,
    warnAfter,
    warned: violationCount >= warnAfter,
    autoSubmitted,
  });
}
