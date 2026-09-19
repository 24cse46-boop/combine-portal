import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: results } = await supabase
    .from("results")
    .select(
      "mcq_score, short_answer_score, total_score, review_status, final_status, admin_notes, attempt:attempts(status, started_at, submitted_at, candidate:candidates(full_name, email, application_id), test:tests(name))"
    )
    .order("total_score", { ascending: false });

  const header = [
    "Candidate name",
    "Email",
    "Application ID",
    "Test",
    "Attempt status",
    "MCQ score",
    "Short answer score",
    "Total score",
    "Review status",
    "Final status",
    "Admin notes",
    "Started at",
    "Submitted at",
  ];

  const rows = (results ?? []).map((r) => {
    const attempt = r.attempt as unknown as {
      status: string;
      started_at: string | null;
      submitted_at: string | null;
      candidate: { full_name: string; email: string; application_id: string | null };
      test: { name: string };
    };
    return [
      attempt.candidate?.full_name,
      attempt.candidate?.email,
      attempt.candidate?.application_id,
      attempt.test?.name,
      attempt.status,
      r.mcq_score,
      r.short_answer_score,
      r.total_score,
      r.review_status,
      r.final_status,
      r.admin_notes,
      attempt.started_at,
      attempt.submitted_at,
    ];
  });

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="combine-foundation-results-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
