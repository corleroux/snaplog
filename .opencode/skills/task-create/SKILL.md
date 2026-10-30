---
name: task-create
description: Create a new task in the project's Supabase task database (staging), or record a roadmap identifier (e.g. P2-FEAT-1) on a task. Use whenever the user wants to create, add, or log a task — including phrases like "create a task for", "add to the backlog", "start tracking", "seed P2-FEAT-1", or "log this as a task". Also triggers when the user completes work and wants to record follow-on items discovered during that work.
compatibility: Requires the Supabase CLI (supabase).
---

# task-create

Creates a task in the Supabase **staging** task database. Generates all content
autonomously from context — do not ask the user to write descriptions or steps.

This skill is part of the task lifecycle: `task-create` → `task-plan` → `task-claim` → `task-complete`. Each skill can run independently, but they are designed to chain together.

All reads/writes go through `supabase db query --linked`, which connects to the
linked Supabase project (project ref `sqshnzkgqdoiocnaunpu`) and bypasses RLS. The
Supabase CLI must be authenticated and linked before using this skill. Note:
`SUPABASE_ACCESS_TOKEN` **and** `SUPABASE_DB_PASSWORD` must both be set — without
the DB password the command hangs at `Initialising login role...`.

Read `docs/task-schema.md` for the full DB schema, field constraints, and the
`dependencies_met` gotcha before writing any SQL.

---

## Phase 1 — Avoid duplicates

Query the database and check for an existing task before creating anything:

```sql
-- Check by roadmap_id first (exact match)
SELECT id, short_desc, state FROM tasks
WHERE roadmap_id = '<supplied_roadmap_id>';

-- If no roadmap_id supplied, fuzzy-match on short_desc
SELECT id, short_desc, state FROM tasks
WHERE short_desc LIKE '%' || '<keywords>' || '%'
  AND state NOT IN ('done', 'cancelled');
```

Run with: `supabase db query --linked "<SQL above>"`

If a non-cancelled, non-done match exists, tell the user and offer to claim it
instead of creating a duplicate. Stop here if they confirm the match.

---

## Phase 2 — Ask clarifying questions

Before generating anything, assess what you know. If the user's input is thin or
ambiguous, ask up to 3 targeted questions in a single message. Do not ask
questions you can answer from context, the conversation history, or the codebase.

**Ask when genuinely unclear:**
- Scope: is this a small targeted change or a broader feature?
- Priority: is there a deadline or urgency signal?
- Known constraints: are there architectural decisions or patterns that must be followed?
- Dependencies: does this block or depend on other in-flight work?
- Delivery mode: does this require a human to take external action outside this codebase (e.g. configure a third-party service, set GitHub env vars) — or can it be completed with code changes alone?

**Do not ask:**
- What files to touch — the planning agent figures that out
- How to implement it — that is also the planner's job
- Things already stated by the user in this conversation

If the input is clear enough to proceed, skip this phase entirely. The goal is a
single round of questions up front — not a back-and-forth interview.

---

## Phase 3 — Generate content autonomously

Generate all of the following yourself from context and any answers provided above.

**short_desc**
A single imperative sentence, ≤ 12 words, starting with a verb.
Example: `Wire SavedFilters into vendor and style list screens`

**detailed_desc**
Context notes for the planning agent — not a step-by-step execution plan.
`task-plan` will read this plus the actual code and replace it with a
file-level plan before the task is claimed.

Write 3–6 sentences covering:
- What this task needs to accomplish (the goal, not the steps)
- Which feature area or files are likely affected
- Any known constraints, dependencies, or design decisions already made
- Any traps or non-obvious context the planner should know

Example:
```
Trade fair buyers need to mark styles as shortlisted vs merely catalogued.
No favourite mechanism exists anywhere — requires new DB column (is_shortlisted
on fabric_styles), RLS review, and a UI toggle in StyleCard, StyleListScreen,
and StyleDetailScreen. Existing RLS "members can update fabric_styles" likely
covers the new column — verify before adding new policies.
```

**classification** — infer from work type (see `docs/task-schema.md` for the full list)

**delivery_mode** — `'code'` (default) or `'manual'`. Use `'manual'` for tasks that require a human developer action outside the codebase (e.g. configuring a third-party service, setting GitHub environment settings, running a CLI tool manually). Manual tasks are excluded from coding agent claim queues.

**priority** — use the roadmap tier from the supplied identifier (e.g. `P2-FEAT-1` → `P2`) when the user provides one; otherwise infer from impact and urgency below.
For organic tasks, infer from impact and urgency:
- `P0` — blocks production or blocks other agents right now
- `P1` — should ship before the next release
- `P2` — important, within 4 weeks
- `P3` — next quarter
- `P4` — strategic / no committed date

**roadmap_id, roadmap_tier, roadmap_section** — if the user supplies a roadmap identifier (e.g. `P2-FEAT-1`), store it here and derive tier/section from the prefix or their input (`P2-FEAT-1` → tier `P2`, section `Feature Wiring`). These columns are the source of truth for the roadmap, which is projected from the task database — there is no standalone roadmap file to read from. Leave null for organic tasks that aren't tied to a roadmap item.

**estimated_end_date** — ask only if the user mentioned a deadline or if
priority is P0/P1. Otherwise leave null.

---

## Phase 4 — Check dependencies

If the user mentioned that this task depends on other work, look up those tasks:

```sql
SELECT id, short_desc, state
FROM tasks
WHERE roadmap_id IN ('<mentioned_ids>')
   OR short_desc LIKE '%' || '<keyword>' || '%';
```

Identify any that are not yet `done` — these are unsatisfied dependencies.
If no dependencies were mentioned, skip this phase and set `dependencies_met = 1`.

---

## Phase 5 — Confirm with the user

Present this format before writing anything:

---
**New task**
- Summary: [short_desc]
- Type: [classification]
- Priority: [priority]
- Delivery: [delivery_mode ('code' or 'manual')]
- Estimated completion: [date or "not set"]
- Dependencies: [list of blocking tasks, or "none"]
- Plan: none — run `task-plan <id>` before claiming

**Context**
[detailed_desc — the task description and known constraints]

Confirm to create, or tell me what to change.
---

If the delivery mode is unclear from the task description, prompt the user:
```
Is this a coding task (changes to this codebase) or a manual task 
(e.g., configure a service, run CLI tools, set environment variables)?
Type: [classification] — [ask for 'code' or 'manual']
```

Iterate until the user approves. Do not touch the DB before approval.

Iterate until the user approves. Do not touch the DB before approval.

---

## Phase 6 — Write to the DB

After approval, write via `supabase db query --linked`. Each call auto-commits, so
there is no transaction-rollback risk between calls. Use `RETURNING` to capture the
new task id (Postgres has no `last_insert_rowid()`).

**Step 1 — insert the task and its creation history, returning the new id:**

The `agent_id` value here is the literal string `'creator'` — a stable role tag for the task-create skill, distinct from the per-session `claude-<hex>` IDs the `task-claim` skill generates. This keeps the audit trail readable: `task_history` rows show who acted (creator / planner / claude-<hex>) without ambiguity.

```bash
supabase db query --linked "
WITH new_task AS (
    INSERT INTO tasks (
        short_desc, detailed_desc, classification, priority,
        state, dependencies_met, estimated_end_date,
        roadmap_id, roadmap_tier, roadmap_section,
        delivery_mode
    ) VALUES (
        '<short_desc>', '<detailed_desc>', '<classification>', '<priority>',
        'todo',
        <deps_met>,
        <estimated_end_date_or_NULL>,
        <roadmap_id_or_NULL>, <roadmap_tier_or_NULL>, <roadmap_section_or_NULL>,
        '<delivery_mode>'
    )
    RETURNING id
)
INSERT INTO task_history (task_id, old_state, new_state, agent_id, notes)
SELECT id, NULL, 'todo', 'creator', 'Task created' FROM new_task
RETURNING task_id;
"
```

Read the returned `task_id` for Step 2.

**Step 2 — insert dependencies (omit entirely if none):**

```bash
supabase db query --linked "
INSERT INTO task_dependencies (dependent_id, dependency_id)
VALUES (<new_id>, <dep_id_1>), (<new_id>, <dep_id_2>);
"
```

**Step 3 — confirm the row persisted:**

```bash
supabase db query --linked "SELECT id, short_desc, state FROM tasks ORDER BY id DESC LIMIT 1;"
```

If `deps_met = 0`, warn the user: this task cannot be claimed until the listed
dependencies are marked done.

---

## Phase 7 — Report back

```
Task #<id> created — "<short_desc>"

Next steps:
1. task-plan <id>   — read the code and write a file-level execution plan
2. task-claim <id>  — claim the task and begin work (blocked until plan is ready)
```

---

## Edge cases

- If the user asks to create a task that already exists and is `done`, tell them and stop.
- If a `roadmap_id` is supplied that doesn't exist in the DB, create the task fresh and
  store the provided value in `roadmap_id`.
- Never create a task with `state = 'in_progress'` — creation always lands in `todo`.
- `roadmap_id` has a UNIQUE constraint. If the user tries to seed the same roadmap item
  twice, Phase 1 will catch it. Do not attempt the INSERT if it would violate uniqueness.
