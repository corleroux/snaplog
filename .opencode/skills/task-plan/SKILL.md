---
name: task-plan
description: Produce a precise, file-level execution plan for a task and write it back to the Supabase task database (staging). Use when the user wants to plan a task before claiming it, when a task has plan_status of "none" or "needs_replan", or when triggered by phrases like "plan this task", "write the plan for", or "figure out how to implement". Also use for batch planning a tier with "--batch". Only plans — reads code, reasons about it, writes a plan. Never modifies source files.
compatibility: Requires the Supabase CLI (supabase).
---

# task-plan

Produce a precise, file-level execution plan for a task and write it back to the
Supabase **staging** task database. This skill ONLY plans — it reads code, reasons
about it, and writes a plan. It never modifies source files.

This skill is part of the task lifecycle: `task-create` → `task-plan` → `task-claim` → `task-complete`. Each skill can run independently, but they are designed to chain together.

All reads/writes go through `supabase db query --linked`, which connects to the
linked Supabase project (project ref `<project-ref>`) and bypasses RLS. The
Supabase CLI must be authenticated and linked before using this skill. Note:
`SUPABASE_ACCESS_TOKEN` **and** `SUPABASE_DB_PASSWORD` must both be set — without
the DB password the command hangs at `Initialising login role...`.

The output of this skill is the input to a coding agent running `task-claim`.

---

## What this skill is not

- It does not write code.
- It does not run tests.
- It does not make git commits.
- It does not modify any file outside the Supabase staging task database.

If you catch yourself opening a file to edit it, stop. Write what you *would* do
into the plan instead.

---

## Phase 1 — Load the task

Accept a task ID or roadmap ID: `task-plan P2-FEAT-1` or `task-plan 21`

Query the database:

```sql
SELECT t.*, STRING_AGG(td.dependency_id::text, ',') AS dep_ids
FROM tasks t
LEFT JOIN task_dependencies td ON td.dependent_id = t.id
WHERE t.roadmap_id = '<roadmap_id>' OR t.id = <id>
GROUP BY t.id;
```

Run with: `supabase db query --linked "<SQL above>"`

Check preconditions — stop and explain if any fail:
- `state` must be `todo` (not `done`, `blocked`, `in_progress`, or `cancelled`)
- `dependencies_met` must be `1`
- If `plan_status = 'ready'` and `--replan` was NOT passed: print "Task already planned. Use `--replan` to force re-planning." and stop.
- If `plan_status = 'ready'` and `--replan` WAS passed: proceed to plan.
- If `plan_status = 'ambiguous'` or `'needs_discovery'`: proceed (planning will update the status).
- Otherwise, `plan_status = 'none'`: proceed.

---

## Phase 2 — Read the codebase

Before forming any opinion about what needs to be done, read the relevant code.
Do not rely solely on `detailed_desc` — it contains notes, not ground truth.

**Mandatory reads:**
- Any file paths mentioned in `detailed_desc` or `short_desc`
- The feature directory most likely to be affected (e.g. `src/features/vendors/`)
- Any type definition files relevant to the task (e.g. `src/types/`, `*.types.ts`)

**For each read, note:**
- What currently exists vs what `detailed_desc` says should exist
- Any naming discrepancies, missing imports, or type mismatches
- Files the task description does NOT mention but that will clearly be affected

**Do not read more than you need.** The goal is targeted understanding, not a full
codebase audit. If you find yourself reading unrelated files, stop.

---

## Phase 3 — Assess ambiguity

After reading, make an honest assessment. Set `ambiguity_level` according to these
definitions:

**`clear`** — You can write the plan now. You know exactly which files to touch,
which functions to modify, and what the end state looks like. A coding agent could
execute this plan without making any architectural decisions.

**`ambiguous`** — The task has a defined goal but one or more decisions need to be
made before execution can begin. Examples:
- Two valid implementation approaches with non-trivial tradeoffs
- A component that may or may not already exist in partially working form
- A missing dependency (type, API, schema) that the plan depends on

**`needs_discovery`** — The task cannot be planned without exploratory work first.
The codebase state is materially different from what the task description assumes,
or the scope is undefined. Examples:
- The component to be wired does not exist in the location described
- The task says "audit X" with no specific outcome defined
- A prior agent left the code in an unknown state

For `ambiguous` and `needs_discovery`, set `plan_status = 'ambiguous'`, write
`plan_notes` explaining exactly what is unknown and what information would resolve it,
and stop. Do not produce a speculative plan. The human will decide whether to
decompose the task, resolve the ambiguity first, or accept the risk.

---

## Phase 4 — Write the execution plan

Only reached if `ambiguity_level = 'clear'`.

Write the plan as a numbered list of atomic steps. Each step must satisfy:

**Specificity rule:** A coding agent must be able to execute the step without
making any decision not already made in the plan. If the step requires a judgment
call, that judgment must be included in the plan.

**Format per step:**
```
N. [Verb] [exact file path]
   - [specific change: function name, line context, what to add/remove/replace]
   - [expected result or test to verify]
```

**Required step types to include where applicable:**
- File reads that the coding agent needs to do first (to understand context)
- Each distinct file modification, in logical order
- Any new file to be created, with its location and expected exports
- Type changes that ripple across files (list all affected files)
- For edge function tasks: verify all 5 doc files are updated (SPEC.md, EDGE_FUNCTIONS.md, EDGE_FUNCTION_CONTRACTS.md, EDGE_FUNCTION_HARDENING.md, DEPLOYMENT_RUNBOOK.md)
- The build/lint/test command to run at the end to verify

**Verification command:** use `pnpm build` (runs `tsc -b` + vite build) as the authoritative type/compile check. Do NOT use `pnpm lint` as a gate — this repo's ESLint flat config reports ~12k pre-existing errors repo-wide (a config issue, not your changes), so a lint gate is noise. If you want a lighter check, `pnpm build` alone is sufficient. Only add a `pnpm test` step when the task has meaningful automated tests.
- Any manual verification step if automated tests don't cover it

**What a good step looks like:**
```
3. Modify src/features/filters/SavedFilters.tsx
   - Import is already correct; no changes needed here
   - Confirm the component accepts onApply: (filters: FilterState) => void prop

4. Modify src/features/vendors/screens/VendorListScreen.tsx
   - Add import: import { SavedFilters } from '../../filters/SavedFilters'
   - Locate the existing filter panel (search for FilterPanel around line 84)
   - Add <SavedFilters onApply={handleFilterApply} /> directly above <FilterPanel>
   - handleFilterApply already exists as setActiveFilters — pass that directly

 5. Run: pnpm build
   - Expect: zero TypeScript errors. This is the authoritative check — do NOT use pnpm lint (this repo reports ~12k pre-existing config-level lint errors repo-wide, unrelated to your change).
   - If TS complains about FilterState type mismatch: open src/types/filters.ts
     and confirm the shape matches what SavedFilters expects
```

**What a bad step looks like:**
```
3. Wire SavedFilters into the vendor list screen   <- no file, no specifics
4. Fix any TypeScript errors that come up          <- deferred decision
```

### Generating plan_todos

After writing the plan, generate a `plan_todos` JSONB array for the agent's local todo list. Each plan step becomes one todo item:

```json
[
  {"content": "Read src/features/vendors/...", "status": "pending", "priority": "high"},
  {"content": "Modify src/features/filters/SavedFilters.tsx", "status": "pending", "priority": "high"},
  {"content": "Modify src/features/vendors/screens/VendorListScreen.tsx", "status": "pending", "priority": "high"},
  {"content": "Run: pnpm build", "status": "pending", "priority": "medium"}
]
```

- `content`: concise description from the step (verb + file + key action)
- `status`: always "pending" initially
- `priority`: "high" for file modifications, "medium" for reads/verification, "low" for docs

**Manual verification is OUT of scope for this workflow.** Do NOT add todo items like "manually verify in browser", "check light/dark theme", or "visually confirm the result". Manual/visual verification happens in a separate workflow outside this agent loop and will never be completed here — carrying `pending` manual-check todos into `task-complete` only pollutes `actual_todos` and gives a false impression the work is unfinished. Keep todos to concrete, agent-executable steps only (reads, edits, build).

---

## Phase 5 — Estimate effort

After the plan, add a brief effort note:

- **Step count:** how many distinct file modifications
- **Risk:** low / medium / high
  - low: self-contained, no type changes, existing tests cover it
  - medium: touches multiple features, some type changes, manual verification needed
  - high: touches core data flow, no tests, or depends on runtime behaviour
- **Estimated agent time:** rough minutes a focused coding agent should need
  (this trains your intuition over time — compare against actual `cycle_minutes`)

These three values are persisted in Phase 6 to `plan_step_count`, `plan_risk`, and
`plan_est_minutes`. `task-claim` reads them to show risk/effort in the work brief, so
keep them accurate — don't leave them in the prose alone.

---

## Phase 6 — Write back to the database

Write via `supabase db query --linked`. Each call auto-commits, so there is no
transaction-rollback risk. Use a CTE so the `task_history` row is only written if
the `UPDATE` matched (guards against a stale/wrong task id).

```bash
supabase db query --linked "
WITH planned AS (
    UPDATE tasks
    SET detailed_desc    = '<new_plan>',
        plan_todos       = '<plan_todos_jsonb>',
        plan_status      = '<ready|ambiguous|needs_replan>',
        ambiguity_level  = '<clear|ambiguous|needs_discovery>',
        plan_notes       = <notes_or_NULL>,
        plan_step_count  = <plan_step_count_or_NULL>,
        plan_risk        = '<plan_risk_or_NULL>',
        plan_est_minutes = <plan_est_minutes_or_NULL>,
        planned_at       = now(),
        updated_at       = now()
    WHERE id = <task_id>
    RETURNING id
)
INSERT INTO task_history (task_id, old_state, new_state, agent_id, notes)
SELECT id, 'todo', 'todo', 'planner', 'Plan written — ambiguity_level: <level>'
FROM planned
RETURNING task_id;
"
```

Note: `state` does not change. Planning is not claiming. The `agent_id` literal `'planner'` distinguishes this role from the per-session `'claude-<hex>'` IDs generated at claim time.

---

## Phase 7 — Report to the human

Output a structured summary for human review:

---
**Plan: [roadmap_id] — [short_desc]**
Ambiguity: [clear / ambiguous / needs_discovery]
Risk: [low / medium / high]
Steps: [N] file modifications
Est. agent time: [X] minutes

[If ambiguous or needs_discovery:]
**Cannot plan yet — [concise reason]**
Resolve by: [specific question or action]

[If clear:]
**Execution plan written to database.**
Review with: `task-plan --show [id]`
When ready: `task-claim [id]`
---

Do not print the full plan to the terminal unless the user asks. It lives in the
database. The summary is what the human needs to decide whether to proceed.

---

## Flags

`task-plan --show [id]`
Print the current plan from the database without re-planning.

`task-plan --replan [id]`
Force re-plan even if `plan_status = 'ready'`. Sets `plan_status = 'needs_replan'`
first, then runs the full flow. Use when codebase has changed since the plan was
written.

`task-plan --batch [tier]`
Plan all `todo` tasks in a given tier where `plan_status = 'none'`. Processes them
in priority order. Stops and reports when any task is `ambiguous` or
`needs_discovery` — does not skip over them silently.
