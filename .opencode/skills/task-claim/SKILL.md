---
name: task-claim
description: Atomically claim a task from the Supabase task database (staging) and set up a git worktree so work can begin without collision risk. Use when the user says "start", "begin", "work on", "pick up", "claim", or "let's do" a specific task or roadmap item. Also triggers after task-create when the user wants to begin immediately, or when the user asks "what should I work on next?" with intent to start immediately.
compatibility: Requires the Supabase CLI (supabase), git, and Python 3.
---

# task-claim

Claims a task in the Supabase **staging** task database and creates a git worktree for isolated work. The claim is atomic — a race-condition guard prevents two agents from claiming the same task.

This skill is part of the task lifecycle: `task-create` → `task-plan` → `task-claim` → `task-complete`. Each skill can run independently, but they are designed to chain together.

**Contract:** Agent MUST invoke this skill to start work on any task. Do NOT manually set `state = 'in_progress'` or create worktrees/branches outside this skill. Completion is handled by `task-complete` (which handles PR creation → merge → cleanup).

All reads and writes go through `supabase db query --linked`, which connects to the linked Supabase project (project ref `sqshnzkgqdoiocnaunpu`) and bypasses RLS. The Supabase CLI must be authenticated and linked before using this skill. Note: `SUPABASE_ACCESS_TOKEN` **and** `SUPABASE_DB_PASSWORD` must both be set — without the DB password the command hangs at `Initialising login role...`.

**SQL execution note:** The CLI can be slow and occasionally times out (≈120s) on long single-quoted SQL that embeds newlines or JSON. For any multi-line statement (especially `UPDATE ... RETURNING` with a `plan_todos` JSONB blob), write the SQL to a temp file and pass it with `supabase db query --linked --file <path>` rather than inlining it in the shell. Inline single-line queries are fine.

Read `docs/task-schema.md` for the full DB schema before writing any SQL.

---

## Phase 1 — Identify the Target Task

**If a task ID or roadmap ID was supplied** (e.g. `task-claim 44` or `task-claim P2-ARCH-1`), the user has already decided — skip listing, look up the task directly, and proceed. Validate:
- `state = 'todo'`
- `dependencies_met = 1`
- `agent_id IS NULL`

If any check fails, explain clearly and stop:
- `state != 'todo'` → tell the user the current state and who owns it
- `dependencies_met = 0` → query and list the blocking tasks by name
- `agent_id IS NOT NULL` → tell the user which agent currently owns it

Also fetch `plan_todos` for todo initialization:

```sql
SELECT id, short_desc, priority, roadmap_id, classification,
       plan_status, ambiguity_level, plan_risk, plan_est_minutes, plan_todos,
       plan_step_count
FROM tasks
WHERE id = <task_id>;
```

**If no argument was supplied**, surface the top 5 claimable candidates and let the user choose. Do not auto-select — the user decides what to work on.

```sql
SELECT id, short_desc, priority, roadmap_id, classification,
       plan_status, ambiguity_level, plan_risk, plan_est_minutes
FROM tasks
WHERE state = 'todo'
  AND dependencies_met = 1
  AND agent_id IS NULL
  AND delivery_mode = 'code'
  AND ambiguity_level = 'clear'
ORDER BY
  CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2
               WHEN 'P3' THEN 3 WHEN 'P4' THEN 4 ELSE 5 END,
  created_at
LIMIT 5;
```

Run with: `supabase db query --linked "<SQL above>"`

Show the list with `plan_status` and risk/minutes for each, then wait for the user to pick one before proceeding to Phase 1b.

---

## Phase 1b — Plan Gate

After identifying the target task, check `plan_status` before doing anything else:

**`ready`** — An execution plan exists in `detailed_desc`. Proceed to Phase 2.

**`none`** — No plan exists. Stop and advise:
> "This task has no execution plan. Run `task-plan <id>` first to produce a file-level plan, then claim it when ready."
> Do not claim. Do not generate a session ID.

**`ambiguous`** — Planning was attempted but blocked. Stop and show:
> "This task is marked ambiguous: [plan_notes]
> Resolve the ambiguity, then re-run `task-plan --replan <id>`."
> Do not claim. Do not generate a session ID.

**`needs_replan`** — Plan is stale. Treat the same as `none`: stop and ask the user to re-run `task-plan --replan <id>` before claiming.

**Exception:** If the user explicitly passes `--no-plan` (e.g. `task-claim 17 --no-plan`), skip this gate and proceed to Phase 2. Log a warning in `task_history`. Use only for urgent hotfixes where planning is impractical.

---

## Phase 2 — Generate a Session ID

Before writing anything to the DB, generate a unique agent ID for this session:

```bash
python3 -c "import secrets; print('claude-' + secrets.token_hex(4))"
```

This produces a value like `claude-a3f9b2c1`. Store it as `:my_agent_id` — you will use it for every DB write and for the `.agent-session` file. Never reuse a previous session's ID, even if the same task is being resumed.

---

## Phase 3 — Atomic Claim

Execute as two `supabase db query --linked` calls. The `UPDATE ... WHERE` clause is the race-condition guard — if another agent claimed between Phase 2 and Phase 3, the UPDATE matches 0 rows, no `task_history` row is written, and the claim does not land.

**Step 1 — claim (atomic: the CTE only inserts history if the UPDATE matched):**

```bash
supabase db query --linked "
WITH claimed AS (
    UPDATE tasks
    SET state             = 'in_progress',
        agent_id          = '<my_agent_id>',
        actual_start_date = now(),
        updated_at        = now()
    WHERE id = <task_id>
      AND state = 'todo'
      AND agent_id IS NULL
    RETURNING id
)
INSERT INTO task_history (task_id, old_state, new_state, agent_id, notes)
SELECT id, 'todo', 'in_progress', '<my_agent_id>', 'Task claimed'
FROM claimed;
"
```

**Step 2 — verify the claim landed (race guard):**

```bash
supabase db query --linked "SELECT id, state, agent_id FROM tasks WHERE id = <task_id>;"
```

If `state != 'in_progress'` or `agent_id != '<my_agent_id>'`, another agent claimed the task between Phase 2 and Phase 3 — report the collision and stop.

---

## Phase 4 — Create the Git Worktree (isolated, clean, deps-installed)

This phase sets up a fully isolated, hygienic workspace before ANY code is written. The order matters: create the worktree, sync it to remote staging, install dependencies, then record it. All code changes for the task happen inside this worktree — never on the branch that was checked out to create it (i.e. never on `staging` in the main worktree).

Multiple coding agents run in parallel, each in its own worktree. The steps below guarantee a worktree starts from a clean, current `staging` and never inherits uncommitted or stale changes from the main worktree — which would otherwise leak between parallel agents.

Derive names from the task:
- **Worktree path:** `../worktrees/<project-name>-task-<task-id>` (relative to the repo root; resolves next to the main checkout)
- **Branch name:** `task/<task-id>/<roadmap-id-or-slug>`
  - Use `roadmap_id` if set (e.g. `task/17/P2-ARCH-1`)
  - Otherwise slugify `short_desc` to ≤ 30 chars (lowercase, hyphens, no special chars)

**Step 1 — create the worktree off `staging`:**

```bash
git worktree add -b task/<task-id>/<slug> ../worktrees/<project>-task-<task-id> staging
```

**Step 2 — reset the worktree branch to match REMOTE staging (critical).** The local `staging` ref can be stale or carry uncommitted changes from the main worktree. Fetch, then hard-reset the new branch to `origin/staging` so the worktree starts from a known-clean, current base — uncontaminated by anything in the main worktree:

```bash
git -C <worktree_path> fetch origin staging
git -C <worktree_path> reset --hard origin/staging
```

If `fetch` fails (no network), fall back to `git -C <worktree_path> reset --hard staging` — acceptable only when local `staging` is known clean.

**Step 3 — install dependencies inside the worktree.** A fresh worktree has no `node_modules`. Install before coding so the first build/lint/test works. pnpm's content-addressable store makes this near-instant via hard links:

```bash
pnpm install
# run from inside the worktree: cd <worktree_path> && pnpm install
```

**Step 4 — write the session ID file and record the path in the DB:**

```bash
echo "<my_agent_id>" > <worktree_path>/.agent-session
```

```bash
supabase db query --linked "
UPDATE tasks
SET worktree_path   = '<path>',
    worktree_status = 'active',
    updated_at      = now()
WHERE id = <task_id>;
"
```

On failure (branch already exists, path conflict):
- Try once more with `--force`
- If still failing, leave the task as `in_progress` without a worktree and warn the user. Work can proceed in the main worktree — the task is still claimed. Write `.agent-session` to the current working directory instead.

If `git worktree` is not available (not a git repo), skip this phase silently and omit worktree fields from the brief.

---

## Phase 5 — Initialize Local Todo List from Plan

If the task has `plan_todos` (non-empty JSON array), initialize the agent's local todo list using the `todowrite` tool. This gives the agent a structured checklist that mirrors the execution plan.

```json
// Example plan_todos from task-plan:
[
  {"content": "Read src/features/vendors/...", "status": "pending", "priority": "high"},
  {"content": "Modify src/features/filters/SavedFilters.tsx", "status": "pending", "priority": "high"},
  {"content": "Run: pnpm build", "status": "pending", "priority": "medium"}
]
```

**Agent action:** Call `todowrite` with the parsed `plan_todos` array. The agent will then update statuses locally as work progresses (`in_progress` → `completed`).

If `plan_todos` is empty or null, the agent may create its own todos based on `detailed_desc`.

**Manual verification is OUT of scope for this workflow.** Never add todo items for manual/visual checks (e.g. "verify in browser", "check light/dark theme") — those happen in a separate workflow and will never be completed here. Keep todos to concrete, agent-executable steps (reads, edits, build). Likewise, when carrying `plan_todos` from `task-plan`, do not add manual-check items.

---

## Phase 6 — Output the Work Brief and Begin Immediately
Print the brief, then proceed directly into executing the task. Do not wait for the user to say "go ahead" or "start" — the claim is the instruction to start.

---
**Claimed: Task #<id>**
- Roadmap ID: [roadmap_id or "—"]
- Priority: [priority] | Type: [classification]
- Worktree: `[worktree_path or "main worktree"]`
- Branch: `task/<id>/<slug>`

**Plan**
- Risk: [plan_risk or "unrated"] | Est. time: [plan_est_minutes or "unknown"] min | Steps: [plan_step_count or "unknown"]

**Execution steps**
[detailed_desc — print verbatim]

**Definition of done**
Run `task-complete <id>` when the work is finished. This will: create PR → merge to staging → unblock dependencies → clean up worktree/branch.
---

If `--no-plan` was used, prepend this warning to the brief:
"⚠ No execution plan — proceed carefully. Run `task-plan <id>` to plan before starting if time allows."

After printing the brief, immediately begin step 1 of the work. The user has already confirmed the task — no further prompt is needed to start.

**Before finishing:** when the work is done, commit your changes in the worktree BEFORE running `task-complete <id>`. Use `git add -u` to stage all changes to tracked files (including hook-regenerated files like graphify artifacts). If the task created new files, add them explicitly:

```bash
git add -u
git add <path/to/new/file1> <path/to/new/file2>
git commit -m "<short_desc>"
```

`task-complete` refuses to proceed if the worktree has no commit on top of staging or has uncommitted changes — committing first avoids a failed completion.

---

## Edge Cases

- Never claim a task in state `blocked`, `done`, or `cancelled`.
- If `dependencies_met = 0` despite having no rows in `task_dependencies` (data inconsistency), surface this to the user and offer to fix it:
  `UPDATE tasks SET dependencies_met = 1 WHERE id = :id AND state = 'todo'` (run via `supabase db query --linked`).
- If the user supplies a roadmap ID that maps to a done task, tell them it is already complete and suggest `task-create` if they want to log follow-on work.