# Combine Foundation — Volunteer Assessment Portal

Built against `Combine_Foundation_Volunteer_Assessment_Portal_PRD_v1_2.docx`.

Stack: Next.js (App Router, TypeScript) · Tailwind CSS v4 · Supabase (Auth,
Postgres, RLS) · Vercel hosting. n8n automation is a separate system, out of
scope for this codebase (Section 29 of the PRD).

## Phase 1 — Foundation (this delivery)

- [x] Next.js project scaffold, Tailwind, design tokens
- [x] Full Supabase schema (`supabase/migrations/0001_init_schema.sql`) —
      all 13 core tables from PRD Section 31
- [x] Row Level Security policies (`supabase/migrations/0002_rls_policies.sql`)
      enforcing Section 33's candidate/admin access rules
- [x] Candidate auth: `/login`, `/change-password`
- [x] Admin auth: `/admin/login` (verifies an active `admin_users` row —
      a candidate account cannot get in through this door)
- [x] Candidate dashboard (`/dashboard`) — reads real assignment/test data,
      renders the locked-card / active states (countdown + timers are wired
      up for real in Phase 3)
- [x] Admin shell: sidebar nav, `/admin/dashboard` overview cards (live
      counts), `/admin/candidates` (live list). Remaining admin routes
      (`tests`, `questions`, `assignments`, `attempts`, `results`,
      `violations`, `interviews`, `settings`) exist and are access-controlled
      but show a placeholder until their phase lands.
- [x] Middleware-based route protection for `/dashboard`, `/assessment/*`,
      and `/admin/*`

Not built yet (later phases — see PRD Section 43 / the phase plan agreed in
chat): the timed question engine, auto-save, anti-cheating monitoring,
scoring, results review, exports, interview management, n8n hooks.

## Phase 2 — Test Engine (admin side)

- [x] Test CRUD: `/admin/tests` (list), `/admin/tests/new`, `/admin/tests/[id]`
      — name, description, schedule, time zone, attempt limit, violation
      thresholds, and all behaviour toggles from Section 24
- [x] Status workflow enforced server-side (`draft → scheduled → active ⇄
      paused → closed → archived`) — invalid jumps are rejected, not just
      hidden in the UI
- [x] Question bank CRUD: `/admin/questions` (list), `/admin/questions/new`,
      `/admin/questions/[id]` — MCQ (dynamic options, mark-correct) and
      short-answer types, default marks/timer
- [x] Test ↔ question mapping on the test detail page — add a bank question
      with a per-test marks/timer override, remove it, running total marks
- [x] `/admin/assignments` — pick a test, assign/deactivate candidates
      against it (candidates only see a test once assigned, per Section 7)

Still placeholder: the candidate-facing locked card doesn't yet render a
live countdown against these schedules, and there's no candidate-side
attempt flow to actually take a test yet — that's Phase 3.

## Phase 3 — Candidate assessment engine

- [x] Dashboard locked card now has a real, server-synced countdown
      (`/api/server-time` + `LockedCountdown`) — no more device-clock drift,
      auto-refreshes once the window opens
- [x] Rules + agreement screen at `/assessment/[id]` — lists the test's
      actual configured rules (sequential nav, fullscreen, violation
      thresholds) before the checkbox unlocks "Begin assessment"
- [x] `startAttempt` — creates the attempt, locks in a (optionally
      randomized) question order for the whole attempt, re-entrant so a
      refresh/relogin resumes instead of restarting
- [x] Sequential question flow — one question at a time, MCQ or short
      answer, with per-question option order randomized deterministically
      per attempt when the test asks for it
- [x] Server-authoritative timing: the moment a question is first shown is
      recorded in `answers.question_started_at`; the visible countdown is
      just a display of server-computed remaining time, and elapsed time on
      submit is recalculated server-side, never trusted from the client
- [x] Auto-save — every question submit writes the `answers` row
      immediately, whether it's a manual submit or a timeout; refreshing
      mid-question does not lose the running timer or reset progress
- [x] Timeout auto-advance — when a question's timer hits zero client-side,
      the form auto-submits (bypassing the "required" field so an unanswered
      question still advances) and the answer is flagged `auto_advanced`
- [x] MCQ auto-scoring happens inline on submit (`mcq_is_correct`) — no
      score is ever shown to the candidate, per Section 18
- [x] Finishing the last question marks the attempt `submitted` (or
      `auto_submitted` on a final timeout) and redirects to the
      confirmation screen

Not built yet (Phase 4): tab-switch / fullscreen-exit / copy-paste
violation *logging* (the rules screen states the thresholds, but nothing
listens for the events yet), and the admin-side live-attempts monitor.

## Phase 4 — Security & monitoring

- [x] `ViolationMonitor` (client) mounted on every in-progress question —
      detects tab switches, fullscreen exits, refresh/close, copy/cut/paste,
      right-click, and back navigation, and blocks the ones the test asks to
      block (copy/paste, right-click, back nav all `preventDefault`)
- [x] `POST /api/violations` — logs the event server-side (ownership
      re-checked from the session, never trusts a client-supplied candidate
      id), recounts violations for the attempt, and compares against the
      test's own `warn_after_violations` / `max_violations`
- [x] Hitting the warn threshold shows the candidate an in-page warning;
      hitting the max threshold **auto-submits the attempt server-side**
      (status `auto_submitted`) and the client is redirected to the
      confirmation screen — enforcement lives in the API route, not the
      browser
- [x] Fullscreen is requested via an explicit button (browsers block
      auto-requesting fullscreen without a user gesture) when the test
      requires it and the candidate isn't in it
- [x] `/admin/attempts` — real live monitor: everyone currently testing
      (progress, violation count, elapsed time, a "Force submit" override)
      plus the last 20 finished attempts
- [x] `/admin/violations` — the last 100 integrity events across every
      attempt, newest first, with candidate/test/attempt-status context

Known limit: `beforeunload` can only best-effort `sendBeacon` a "refresh"
event — no browser lets a page block or guarantee-detect a real refresh, so
treat that signal as advisory, not proof.

Not built yet (Phase 5): MCQ scores are already computed on submit, but
there's no results review UI, no short-answer grading screen, and no
CSV/Excel export.

## Phase 5 — Evaluation & results

- [x] `finalizeAttemptResult()` — runs automatically every time an attempt
      finishes (normal submit, timeout, a violation auto-submit, or an
      admin's force-submit): sums the already-scored MCQ marks, and creates
      the `results` row with `review_status` set to `pending` only if the
      test actually has short-answer questions still waiting on a grade
- [x] `/admin/results` — every submitted attempt, MCQ/short-answer/total
      score, review status, and final status, sorted by score
- [x] `/admin/results/[attemptId]` — full breakdown per question: MCQ shows
      the candidate's choice against the correct one and marks awarded;
      short answer shows their text with a marks field (capped to that
      question's max, saving recomputes the total and flips review_status
      to `completed` once every short answer has a grade)
- [x] Same page also sets the candidate's final status (pending /
      shortlisted / selected / rejected / on hold) and admin notes —
      finalizing stamps `finalized_by` / `finalized_at`
- [x] `GET /api/results/export` — CSV download of every result (candidate,
      test, all three scores, statuses, notes, timestamps), admin-only

Not built yet (Phase 6): interview scheduling, the `notification_logs`
table has no UI yet (n8n integration is out of scope for this codebase
per Section 29), and final responsive/empty-state polish pass.

## Phase 6 — Interviews & admin onboarding

- [x] `/admin/interviews` — every active candidate with their interview
      status at a glance; `/admin/interviews/[candidateId]` — schedule a
      date/time, method or location, internal notes, and status
      (not scheduled → scheduled → completed → under review → finalized),
      with that candidate's test result(s) shown alongside for context
- [x] Candidate dashboard now shows an "Interview" panel once one's been
      scheduled — status, date, and method/location only. It's a separate,
      narrower query than the admin page: **notes are never fetched** on
      the candidate side, so there's no code path that could leak them
- [x] `/admin/settings` — admin roster (deactivate/reactivate access) and
      an "Add an admin" form that does the full onboarding in one step:
      creates the confirmed Supabase Auth login *and* the `admin_users` row
      together (and rolls back the auth user if the second half fails, so
      you never end up with a login that can't get past the admin check)

Not built: an actual n8n/email hookup for interview or result
notifications — `notification_logs` exists as a table for that
integration to log into, but sending anything is out of scope here per
Section 29. The book-keeping this project asked for is otherwise done;
what's left is mostly the deployment itself and any visual polish you want
once it's running against real data.

## Extras added after Phase 6

- [x] `/admin/candidates` now has "Add one candidate" and "Bulk add" forms
      — creates the confirmed Supabase Auth login and the `candidates` row
      together, same pattern as the admin-onboarding form. Bulk add takes
      one `full_name,email,phone,password[,application_id]` line per
      candidate.
- [x] "Generate with AI" on `/admin/questions` — give it a topic, a count,
      a type (MCQ / short answer / mixed), and a difficulty, and it calls
      Claude to draft questions straight into the question bank for you to
      review/edit like any other question. Needs an `ANTHROPIC_API_KEY`
      environment variable (get one at console.anthropic.com); without it,
      the button just shows a clear error instead of failing silently.

Known gap: a scheduled test doesn't flip to `active` on its own at
`start_at` — an admin currently has to click "Activate now" (or schedule
ahead of time and activate early). Automatic activation would need either
a cron job or a check on page load; flag it if you want that built.

## Setup

1. Create a Supabase project.
2. In the SQL editor, run the two files in `supabase/migrations/` **in
   order** (`0001_init_schema.sql`, then `0002_rls_policies.sql`).
3. Copy `.env.local.example` to `.env.local` and fill in your project's URL
   and keys (Project Settings → API).
4. Create at least one admin so you can reach `/admin/dashboard`:
   - Create the user in Supabase Auth (dashboard or `auth.admin.createUser`).
   - Insert a matching row in `admin_users` with that user's `id` as
     `auth_user_id`.
5. `npm install`
6. `npm run dev` → http://localhost:3000

## Candidate records

Candidates are sourced externally (Google Form → Google Sheet → n8n, per
Section 3.2/29 of the PRD) and are expected to land in the `candidates`
table with a matching Supabase Auth user already provisioned. The exact
sync mechanism (webhook vs scheduled batch) is an open question in the PRD
(Section 48) — to test the portal manually today, insert a `candidates` row
and create its paired Supabase Auth user by hand.

## Project structure

```
src/app/
  login/                    candidate login
  change-password/          forced password change (temp-password flow)
  dashboard/                candidate dashboard
  assessment/[id]/          assessment attempt (Phase 3) + submitted screen
  admin/login/              admin login (outside the sidebar shell)
  admin/(portal)/           authenticated admin area (sidebar layout + guard)
    dashboard/  candidates/  tests/  questions/  assignments/
    attempts/   results/     violations/  interviews/  settings/
src/lib/
  supabase/                 browser / server / service-role / middleware clients
  actions/auth.ts           server actions: login, logout, change password
  admin-nav.ts              sidebar nav config
src/components/             shared UI primitives + admin sidebar + login form
supabase/migrations/        schema + RLS, run in order against your project
```

## Design tokens

Deep teal (`--teal`, trust/authority) on warm paper (`--paper`), with amber
(`--amber`) reserved for time-sensitive/active states. Headings in Source
Serif 4, body/UI in IBM Plex Sans, timers/codes in IBM Plex Mono. Panels use
a 1px hairline border rather than card shadows — see `src/app/globals.css`.
