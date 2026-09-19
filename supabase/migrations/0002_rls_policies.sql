-- Combine Foundation Volunteer Assessment Portal
-- Migration 0002: Row Level Security
-- Reference: PRD v1.2, Section 33 (Security & RLS)
--
-- Model: every table is locked down by default. Candidates can only reach
-- their own rows via helper functions below. Admins (rows in admin_users
-- whose auth_user_id = auth.uid()) get broad read/write access needed to
-- run the portal. Server-side code that must bypass RLS entirely (e.g. the
-- timer/unlock engine) should use the Supabase service role key, never the
-- anon/authenticated key.

-- ============================================================
-- Helper functions
-- ============================================================
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from admin_users
    where auth_user_id = auth.uid() and is_active = true
  );
$$ language sql stable security definer;

create or replace function current_candidate_id()
returns uuid as $$
  select id from candidates where auth_user_id = auth.uid();
$$ language sql stable security definer;

-- ============================================================
-- Enable RLS everywhere
-- ============================================================
alter table candidates enable row level security;
alter table admin_users enable row level security;
alter table tests enable row level security;
alter table questions enable row level security;
alter table question_options enable row level security;
alter table test_questions enable row level security;
alter table test_assignments enable row level security;
alter table attempts enable row level security;
alter table answers enable row level security;
alter table violations enable row level security;
alter table results enable row level security;
alter table interviews enable row level security;
alter table notification_logs enable row level security;

-- ============================================================
-- candidates: own profile only; admins see all
-- ============================================================
create policy candidates_select_own on candidates for select
  using (auth_user_id = auth.uid() or is_admin());
create policy candidates_update_own on candidates for update
  using (auth_user_id = auth.uid() or is_admin());
create policy candidates_admin_write on candidates for insert
  with check (is_admin());
create policy candidates_admin_delete on candidates for delete
  using (is_admin());

-- ============================================================
-- admin_users: admins can see the admin roster; no candidate access
-- ============================================================
create policy admin_users_select on admin_users for select
  using (is_admin());
create policy admin_users_write on admin_users for insert
  with check (is_admin());
create policy admin_users_update on admin_users for update
  using (is_admin());

-- ============================================================
-- tests: candidates may only see tests they are assigned to, and only
-- once status is scheduled/active/paused/closed (never draft). Full
-- question content is exposed separately (see questions policy) which
-- still hides answers pre-unlock at the application layer.
-- ============================================================
create policy tests_admin_all on tests for all
  using (is_admin()) with check (is_admin());

create policy tests_candidate_select on tests for select
  using (
    status <> 'draft'
    and exists (
      select 1 from test_assignments ta
      where ta.test_id = tests.id
        and ta.candidate_id = current_candidate_id()
        and ta.is_active = true
    )
  );

-- ============================================================
-- questions / question_options: admin-managed. Candidates never read
-- these tables directly — the app layer serves only the active question
-- of an in-progress attempt via a server route using the service role,
-- so no direct candidate SELECT policy is granted here.
-- ============================================================
create policy questions_admin_all on questions for all
  using (is_admin()) with check (is_admin());

create policy question_options_admin_all on question_options for all
  using (is_admin()) with check (is_admin());

-- ============================================================
-- test_questions: same treatment as questions
-- ============================================================
create policy test_questions_admin_all on test_questions for all
  using (is_admin()) with check (is_admin());

-- ============================================================
-- test_assignments: candidate can see their own assignment rows
-- ============================================================
create policy test_assignments_admin_all on test_assignments for all
  using (is_admin()) with check (is_admin());

create policy test_assignments_candidate_select on test_assignments for select
  using (candidate_id = current_candidate_id());

-- ============================================================
-- attempts: candidate owns their attempt; can insert/update only their own
-- ============================================================
create policy attempts_admin_all on attempts for all
  using (is_admin()) with check (is_admin());

create policy attempts_candidate_select on attempts for select
  using (candidate_id = current_candidate_id());

create policy attempts_candidate_insert on attempts for insert
  with check (candidate_id = current_candidate_id());

create policy attempts_candidate_update on attempts for update
  using (candidate_id = current_candidate_id())
  with check (candidate_id = current_candidate_id());

-- ============================================================
-- answers: candidate can only touch answers on their own attempt, and
-- can never read/set mcq_is_correct or marks columns (enforced at the
-- application layer via a restricted RPC — direct RLS write access is
-- still limited to their own attempt as a defense-in-depth measure).
-- ============================================================
create policy answers_admin_all on answers for all
  using (is_admin()) with check (is_admin());

create policy answers_candidate_select on answers for select
  using (
    exists (
      select 1 from attempts a
      where a.id = answers.attempt_id
        and a.candidate_id = current_candidate_id()
    )
  );

create policy answers_candidate_insert on answers for insert
  with check (
    exists (
      select 1 from attempts a
      where a.id = answers.attempt_id
        and a.candidate_id = current_candidate_id()
    )
  );

create policy answers_candidate_update on answers for update
  using (
    exists (
      select 1 from attempts a
      where a.id = answers.attempt_id
        and a.candidate_id = current_candidate_id()
    )
  );

-- ============================================================
-- violations: candidate can insert violation events for their own
-- attempt (client reports the event) but cannot read or edit the log —
-- only admins can review it.
-- ============================================================
create policy violations_admin_all on violations for all
  using (is_admin()) with check (is_admin());

create policy violations_candidate_insert on violations for insert
  with check (
    exists (
      select 1 from attempts a
      where a.id = violations.attempt_id
        and a.candidate_id = current_candidate_id()
    )
  );

-- ============================================================
-- results: candidate must NOT see scores/correct answers (Section 33.2,
-- Section 18 — no immediate score). No candidate policy is created here.
-- ============================================================
create policy results_admin_all on results for all
  using (is_admin()) with check (is_admin());

-- ============================================================
-- interviews: candidate may see their own interview status/date only,
-- never admin notes (notes are excluded at the application query layer;
-- the RLS policy below governs row-level access, not column-level).
-- ============================================================
create policy interviews_admin_all on interviews for all
  using (is_admin()) with check (is_admin());

create policy interviews_candidate_select on interviews for select
  using (candidate_id = current_candidate_id());

-- ============================================================
-- notification_logs: admin only
-- ============================================================
create policy notification_logs_admin_all on notification_logs for all
  using (is_admin()) with check (is_admin());
