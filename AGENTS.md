# Snaplog — Agent Operating Instructions

---

## SYSTEM IDENTITY

Mobile-first, AI-assisted trade fair catalogue system.

**Core workflow:** capture → extract → review → commit

**Domain model:**
Event → Vendor → Fabric Style → Variant → Inventory → Price

Supporting entities: Scan Sessions, Drafts, Fabric Images

This is a **fabric-centric system**. Do not introduce generic "product" abstractions.

---

## TECH STACK

| Layer | Stack |
|-------|-------|
| Frontend | React, TypeScript, Vite, Capacitor |
| Backend | Supabase (RLS, Edge Functions, Storage) |
| AI | Gemini (backend-only, via Edge Functions) |
| UI | shadcn/ui, TailwindCSS |

---

## CODING RULES

- Strict TypeScript throughout
- Zod validation on all data boundaries
- Feature-based folder structure
- No logic in JSX — thin UI components only
- Reusable patterns over one-offs
- Extraction ≠ Commit — always keep these separate
- Preserve `raw_payload` → `normalized_payload` → `reviewed_payload` audit chain
- Repo is source of truth — no dashboard-only logic, all edge functions defined in repo

## PACKAGE MANAGER

This project uses **pnpm exclusively**. Never use npm.
- Use `pnpm install` (not `npm install`)
- Use `pnpm run build` or simply `pnpm build` (not `npm run build`)
- Use `pnpm test`, `pnpm dev`, `pnpm lint`, etc.
- `pnpm-lock.yaml` is the lockfile — never generate `package-lock.json`
- pnpm's content-addressable store means worktrees get near-instant installs via hard links

---

## BRANCHING RULES

| Branch | Purpose |
|--------|---------|
| `main` | Production — auto-deployed by Vercel. **Never push directly.** |
| `staging` | Integration branch — all task branches merge here via PR |
| `task/*` | Short-lived task branches — branch off `staging`, PR back to `staging` |

**Rules (non-negotiable):**
- All task branches base off `staging`, not `main`
- All PRs target `staging`, not `main`
- `main` is only updated via a `staging → main` PR when ready to release
- Never push `main` to origin without explicit user instruction
- After a PR is merged into `staging`, delete its head branch (local **and** remote). The merged code lives in `staging`/history — the branch is no longer needed and accumulates stale refs otherwise. See `task-complete` Phase 8 for the exact commands.

---

## MOBILE / OFFLINE RULES

Optimise for fast capture, low connectivity, minimal typing.

Centralise offline state in: `draftStore`, `uploadQueue`, `syncEngine`

---

## SUPABASE ENVIRONMENTS

**One shared Supabase project for both environment slots (until a planned split).** Both staging and production slots currently point at the same project ref — keep the config/env separation intact so a future split stays mechanical.

| Environment | Project slot | Project ref | Env file | When touched |
|-------------|--------------|-------------|----------|--------------|
| **STAGING** (default) | shared project `sqshnzkgqdoiocnaunpu` | `sqshnzkgqdoiocnaunpu` | `.env.local`, `.env.staging`, `.env.test` | **All day-to-day development.** Migrations, edge functions, task DB, CLI (`--linked`) all target the shared project. |
| **PRODUCTION** | shared project `sqshnzkgqdoiocnaunpu` | `sqshnzkgqdoiocnaunpu` | `.env` | **Only during a planned release** (`staging → main`). Never touched while developing. |

**Rules:**
- The Supabase CLI is linked to the **shared project** (`supabase/.temp/project-ref` = `sqshnzkgqdoiocnaunpu`). `supabase db query --linked`, `supabase migration list`, `supabase functions ...` all operate on the shared project by default. This is correct — do **not** flag it as a discrepancy.
- Because staging and production slots share one project, **treat all data as production data**. No throwaway test data in the shared project; use a disposable branch or local stack for tests.
- **Production (main) is only ever deployed during a release.** `supabase db push` is safe to re-run (migrations are idempotent via history), but destructive SQL against the shared project still needs explicit user confirmation.
- Credentials live in `secrets/secrets.md` (gitignored). Never commit or echo them. Old tokens remain in git history — rotate if they were ever shared.

## TASK MANAGEMENT

**Source of truth:** Supabase shared project (project ref: `sqshnzkgqdoiocnaunpu`)

All work is tracked in the Supabase task management tables. CLI access via `supabase db query --linked "SQL"` (requires `SUPABASE_ACCESS_TOKEN` **and** `SUPABASE_DB_PASSWORD` env vars — without the DB password the command hangs at `Initialising login role...`).

**Skills to use:**

| Action | Skill |
|--------|-------|
| Log a new task or backlog item | `/task-create` |
| Plan a task before claiming | `/task-plan` |
| Claim the next task / start work | `/task-claim` |
| Close out completed, blocked, or cancelled work | `/task-complete` |

Lifecycle: `/task-create` → `/task-plan` → `/task-claim` → `/task-complete` (each skill also runs standalone).

**Schema reference:** `docs/task-schema.md` is the authoritative schema — tables, columns, constraints, and the `dependencies_met` / `delivery_mode` gotchas. Note the DB column `delivery_mode` (`code` | `manual`) is distinct from the closeout **Work track** label above: it records whether a task is executable code or a human action outside the codebase, and is set by `/task-create`.

**Classifications:** `docs/task-schema.md` documents 13 `classification` values. Prefer the 4 canonical labels — `defect`, `enhancement`, `new_feature`, `alignment_issue` — for new work; the other 9 are legacy values preserved from the SQLite migration and should be avoided for fresh tasks.

**Rules:**

1. **When the user asks "what should we work on next?" or "claim the next task"** — use `/task-claim` (no arguments) to surface the top 5 claimable tasks and let the user choose.
2. **When discovering a new issue** — use `/task-create` to add it to the task database at the appropriate priority tier. Never silently ignore a systemic finding.
3. **When work is done** — use `/task-complete` to close the task, remove the worktree, and unblock downstream work.
4. **Roadmap is projected from the task database** — the `roadmap_id`, `roadmap_tier`, and `roadmap_section` columns on `tasks` are the source of truth. There is no standalone roadmap file to read or edit; roadmap views (e.g. a Gantt) are generated from these columns going forward.
5. **Agent Rule — Task Completion Contract:** After claiming a task via `/task-claim`, you MUST invoke `/task-complete <id>` when you believe work is done. Do NOT manually update task state to `done`, do NOT delete the worktree/branch. `/task-complete` handles the full lifecycle: PR creation → merge to staging → dependency unblocking → worktree/branch cleanup. If you skip it, the task remains `in_progress` and the branch accumulates as a stale ref.

---

## BEFORE STARTING ANY NON-TRIVIAL TASK

1. Use `/task-claim` to claim the task from the task database — confirm it is tracked or use `/task-create` to add it first
2. Classify the work: `defect` | `enhancement` | `new_feature` | `alignment_issue`
3. Identify the work track:
   - **Feature** — new feature or significant change
   - **Bug Triage** — defect or scoped fix
4. Identify the primary phase (see phases below)
5. For bugs/UAT issues: diagnose before implementing — do not jump to code
6. If the task touches a user-facing screen or component → apply Design checks (see below)
7. Read relevant phase doc and feature doc before writing code

---

## PHASES

| Phase | Responsibility |
|-------|---------------|
| A | Foundations |
| B | Data Model |
| C | Capture |
| D | Review |
| E | Persistence |
| F | Stabilization |
| G | DevOps / Deployment |
| H | Expansion |

---

## CONCERN AREAS (replaces "Guilds")

These are lenses the agent applies — not separate agents.

| Concern | Apply when |
|---------|-----------|
| **Design** | Any user-facing screen, component, interaction, or state |
| **Security** | Auth, RLS, secrets, data exposure, trust boundaries |
| **Platform** | Deployment, edge functions, storage, env vars (Phase G) |
| **Assurance** | Phase F / release readiness — test coverage, smoke checks |

---

## DESIGN CHECKS

Apply when creating/modifying any user-facing screen, component, or interaction.

**Must check:**
- New or modified screen follows existing layout and visual hierarchy patterns
- All states present: empty, loading, error, success
- Design tokens used — no hardcoded colours or spacing
- No visual regression introduced

**Does not apply to:** logic-only changes, backend/data layer, documentation.

---

## ROOT CAUSE (required for all non-trivial issues)

Answer before implementing:
1. What is the root cause?
2. Where does it live?
3. How was it introduced?
4. Why was it not caught?

State uncertainty honestly — do not fake certainty.

---

## RECURRENCE PREVENTION (required for all fixes)

After fixing, evaluate:
- Can a test prevent this recurring? If not, why not?
- Should a smoke check be updated?
- Should a doc be updated?

If a systemic weakness is found: fix it now, or log it explicitly. Never silently ignore it.

---

## DEFINITION OF DONE

A task is not done until:
- [ ] Scoped to one phase / one concern area
- [ ] Root cause understood (for fixes)
- [ ] Recurrence prevention addressed
- [ ] Tests considered if applicable
- [ ] UI states complete if user-facing (empty, loading, error, success)
- [ ] No hidden redesign or boundary violations
- [ ] Docs updated if behaviour changed

---

## ENGINEERING CLOSEOUT (required for every meaningful task)

End every task with:

**SUMMARY** — one paragraph, what was done and why

**CLASSIFICATION**
- Type: defect | enhancement | new_feature | alignment_issue
- Phase: [primary phase]
- Concern areas: [Design / Security / Platform / Assurance — whichever applied]
- Work track: Feature | Bug Triage

**ROOT CAUSE** (for fixes)

**FILES CHANGED**

**WHAT WAS NOT TOUCHED**

**RECURRENCE PREVENTION**

**TEST IMPACT** — added / updated / none (with reason)

**OUT-OF-SCOPE FINDINGS** — log anything noticed but not actioned; use `/task-create` to add systemic findings to the task database

**TASK UPDATE** — run `/task-complete` to close the active task; use `/task-create` for any newly discovered follow-on items

**CONFIRMATION** — no boundary violations, no hidden redesign

---

## ANTI-PATTERNS

- Jumping to code from a vague or unclassified issue
- Multi-phase changes in a single task
- Hidden redesign inside a scoped fix
- Skipping root cause on a defect
- Skipping recurrence prevention
- Hardcoded values or logic leaking into JSX

---

## SESSION MEMORY

### PostHog Error Tracking Overhaul (Jun 2026)

**Complete.** Custom error classes, enriched PostHog config, polling infra, admin UI.

**Infrastructure:**
- PostHog cloud: **US** (`us.i.posthog.com`), not EU
- PostHog Project ID: `403472`
- PostHog Project API Key (browser): `phc_s5rnH3FQQZwCDpazSQJqLUcZA5dW6MX5pqTDji8kdYM9` (public/anon — safe in client bundles)
- PostHog Personal API Key (server): see `secrets/secrets.md` (gitignored — never commit, never echo)
- Supabase project ref / access token / DB password: see `secrets/secrets.md` (gitignored)

**Key patterns to maintain:**
- Custom error classes must use `this.name` for `$exception_type` — PostHog derives the grouping from `error.name`
- `capture_exceptions` object form requires ALL three flags: `capture_unhandled_errors`, `capture_unhandled_rejections`, `capture_console_errors` (each defaults to `false` when merged)
- `$exception_fingerprint` should be set on every `captureException` call for proper issue grouping by endpoint
- Use `addExceptionStep()` at risky call sites for breadcrumbs in PostHog
- `sourcemap: true` in vite config — PostHog auto-fetches them from deployment URL

**Files created this session:**
- `src/lib/errors.ts` — `SupabaseApiError`, `AuthSessionError`, `ApplicationError`
- `src/lib/error-tracking/client.ts` — PostHog API HTTP client
- `src/lib/error-tracking/reporting.ts` — `formatErrorReport()` + `inferSuggestedAction()`
- `src/lib/error-tracking/ErrorTrackingProvider.tsx` — React context + `useErrorTracking()` hook
- `supabase/functions/poll-posthog-errors/index.ts` — on-demand Edge Function
- `supabase/migrations/073_create_posthog_errors_tables.sql` — tables + RLS
- `supabase/migrations/074_fix_posthog_errors_nullable.sql` — make last_seen/title nullable
- `supabase/migrations/075_fix_posthog_errors_rls.sql` — fix RLS to check profiles.role

**Key gotchas:**
- PostHog Error Tracking API returns `name` (exception type) and `description` (error message), NOT `exception_type`/`exception_message`
- The API does NOT return `occurrence_count`, `users_count`, `last_seen`, or `fingerprint` at the issue list level
- Supabase RLS policies must use `profiles.role` pattern (join to `public.profiles`), NOT `auth.jwt() ->> 'role'` which always returns `'authenticated'`

**Deploy procedures:**
- Migrations: `supabase link --project-ref sqshnzkgqdoiocnaunpu` then `supabase db push`
- Edge Functions: `supabase functions deploy <name> --project-ref sqshnzkgqdoiocnaunpu`
- Secrets: `supabase secrets set KEY=val --project-ref sqshnzkgqdoiocnaunpu`
- All commands require `SUPABASE_ACCESS_TOKEN` (read from `secrets/secrets.md`) with project access

**Admin UI:** Error Tracking card lives at `/admin/health` with Sync button and error list.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
