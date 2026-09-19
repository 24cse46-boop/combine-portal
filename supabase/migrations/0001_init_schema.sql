-- Combine Foundation Volunteer Assessment Portal
-- Migration 0001: Core schema
-- Reference: PRD v1.2, Section 31 (Supabase Database)

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- Enums
-- ============================================================
create type test_status as enum ('draft', 'scheduled', 'active', 'paused', 'closed', 'archived');
create type question_type as enum ('mcq', 'short_answer');
create type attempt_status as enum ('not_started', 'in_progress', 'submitted', 'auto_submitted', 'flagged');
create type review_status as enum ('pending', 'under_review', 'completed');
create type interview_status as enum ('not_scheduled', 'scheduled', 'completed', 'under_review', 'finalized');
create type final_status as enum ('pending', 'shortlisted', 'rejected', 'selected', 'on_hold');
create type violation_type as enum ('tab_switch', 'fullscreen_exit', 'refresh', 'copy', 'paste', 'right_click', 'text_selection', 'back_navigation', 'other');
create type notification_type as enum ('test_assigned', 'interview_update', 'final_result', 'other');
create type notification_status as enum ('pending', 'sent', 'failed');

-- ============================================================
-- candidates
-- Candidate profile + login reference (linked to Supabase Auth user)
-- ============================================================
create table candidates (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  application_id text unique, -- reference back to the external Google Form / Sheet record
  must_change_password boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- admin_users
-- Authorized admin accounts (linked to Supabase Auth user)
-- ============================================================
create table admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- tests
-- Test definitions, schedule, and configuration (Section 24)
-- ============================================================
create table tests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status test_status not null default 'draft',
  time_zone text not null default 'Asia/Karachi',
  start_at timestamptz,
  end_at timestamptz,
  randomize_questions boolean not null default false,
  randomize_options boolean not null default false,
  sequential_navigation boolean not null default true,
  require_fullscreen boolean not null default true,
  disable_copy_paste boolean not null default false,
  disable_right_click boolean not null default false,
  disable_text_selection boolean not null default false,
  disable_back_navigation boolean not null default true,
  max_violations int not null default 3, -- auto-submit threshold
  warn_after_violations int not null default 1,
  attempt_limit int not null default 1,
  created_by uuid references admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- questions
-- Question bank (MCQ / short answer) (Section 11)
-- ============================================================
create table questions (
  id uuid primary key default gen_random_uuid(),
  type question_type not null,
  prompt text not null,
  default_marks numeric(6,2) not null default 1,
  default_time_seconds int not null default 60,
  created_by uuid references admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- question_options
-- MCQ options and the correct-answer flag
-- ============================================================
create table question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  sort_order int not null default 0
);

-- ============================================================
-- test_questions
-- Mapping of questions to a specific test, with marks/timer overrides
-- ============================================================
create table test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references tests(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  marks numeric(6,2) not null,
  time_seconds int not null,
  sort_order int not null default 0,
  unique (test_id, question_id)
);

-- ============================================================
-- test_assignments
-- Which candidate is assigned to which test
-- ============================================================
create table test_assignments (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references tests(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  assigned_by uuid references admin_users(id),
  assigned_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (test_id, candidate_id)
);

-- ============================================================
-- attempts
-- A candidate's in-progress or completed attempt at a test
-- ============================================================
create table attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references tests(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  status attempt_status not null default 'not_started',
  current_question_index int not null default 0,
  started_at timestamptz,
  submitted_at timestamptz,
  agreed_to_rules_at timestamptz,
  question_order jsonb, -- ordered array of test_question ids (post-randomization)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (test_id, candidate_id)
);

-- ============================================================
-- answers
-- Candidate responses per question within an attempt
-- ============================================================
create table answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts(id) on delete cascade,
  test_question_id uuid not null references test_questions(id) on delete cascade,
  selected_option_id uuid references question_options(id),
  short_answer_text text,
  question_started_at timestamptz,
  answered_at timestamptz,
  auto_advanced boolean not null default false,
  mcq_is_correct boolean,
  mcq_marks_awarded numeric(6,2),
  short_answer_marks_awarded numeric(6,2),
  reviewed_by uuid references admin_users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (attempt_id, test_question_id)
);

-- ============================================================
-- violations
-- Logged integrity events per attempt (Section 16)
-- ============================================================
create table violations (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts(id) on delete cascade,
  type violation_type not null,
  detail text,
  occurred_at timestamptz not null default now()
);

-- ============================================================
-- results
-- Final computed scores and review status (Section 26)
-- ============================================================
create table results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references attempts(id) on delete cascade,
  mcq_score numeric(7,2) not null default 0,
  short_answer_score numeric(7,2) not null default 0,
  total_score numeric(7,2) not null default 0,
  review_status review_status not null default 'pending',
  final_status final_status not null default 'pending',
  admin_notes text,
  finalized_by uuid references admin_users(id),
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- interviews
-- Interview scheduling, notes, and status (Section 27)
-- ============================================================
create table interviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  status interview_status not null default 'not_scheduled',
  scheduled_at timestamptz,
  method_or_location text,
  notes text,
  updated_by uuid references admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- notification_logs
-- Record of notifications triggered for n8n automation tracking (Section 37)
-- ============================================================
create table notification_logs (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete set null,
  type notification_type not null,
  status notification_status not null default 'pending',
  provider text, -- e.g. 'email', 'whatsapp'
  payload jsonb,
  triggered_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index idx_test_questions_test_id on test_questions(test_id);
create index idx_test_assignments_candidate_id on test_assignments(candidate_id);
create index idx_test_assignments_test_id on test_assignments(test_id);
create index idx_attempts_candidate_id on attempts(candidate_id);
create index idx_attempts_test_id on attempts(test_id);
create index idx_answers_attempt_id on answers(attempt_id);
create index idx_violations_attempt_id on violations(attempt_id);
create index idx_interviews_candidate_id on interviews(candidate_id);
create index idx_notification_logs_candidate_id on notification_logs(candidate_id);

-- ============================================================
-- updated_at trigger helper
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_candidates_updated_at before update on candidates
  for each row execute function set_updated_at();
create trigger trg_tests_updated_at before update on tests
  for each row execute function set_updated_at();
create trigger trg_questions_updated_at before update on questions
  for each row execute function set_updated_at();
create trigger trg_attempts_updated_at before update on attempts
  for each row execute function set_updated_at();
create trigger trg_results_updated_at before update on results
  for each row execute function set_updated_at();
create trigger trg_interviews_updated_at before update on interviews
  for each row execute function set_updated_at();
create trigger trg_notification_logs_updated_at before update on notification_logs
  for each row execute function set_updated_at();
