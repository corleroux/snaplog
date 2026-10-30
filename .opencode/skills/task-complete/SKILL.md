---
name: task-complete
description: Close out a task in the Supabase task database (staging) — mark it done, blocked, or cancelled; record completion time; safely remove the git worktree; and unblock any downstream tasks that were waiting on it. Agent MUST invoke this skill after pushing the final commit to the task branch. Do NOT manually update task state to done, do NOT delete the worktree/branch — this skill handles PR creation → merge → dep unblock → cleanup.
compatibility: Requires the Supabase CLI (supabase), git, and the GitHub CLI (gh).
---

# task-complete

Closes an active task in the Supabase task database (shared project `sqshnzkgqdoiocnaunpu`). Handles three terminal paths: `done`, `blocked`, and `cancelled`. Each has different downstream behaviour — read carefully before writing any SQL.

This skill is part of the task lifecycle: `task-create` → `task-plan` → `task-claim` → `task-complete`. Each skill can run independently, but they are designed to chain together.

All reads/writes go through `supabase db query --linked`, which connects to the linked Supabase project (project ref `sqshnzkgqdoiocnaunpu`) and bypasses RLS. The Supabase CLI must be authenticated and linked before using this skill. Note: `SUPABASE_ACCESS_TOKEN` **and** `SUPABASE_DB_PASSWORD` must both be set — without the DB password the command hangs at `Initialising login role...`.

**SQL execution note:** The CLI can be slow and occasionally times out (≈120s) on long single-quoted SQL that embeds newlines or JSON. For any multi-line statement (especially the Phase 6 CTE with an `actual_todos` JSONB blob), write the SQL to a temp file and pass it with `supabase db query --linked --file <path>` rather than inlining it in the shell. Inline single-line queries are fine.

Read `docs/task-schema.md` for the full DB schema.

---

## Phase 0 — Pre-complete Validation (Mandatory)

Before identifying the task, verify preconditions on any task ID supplied:

```sql
SELECT id, state, worktree_path, worktree_status
FROM tasks WHERE id = <task_id>;
```

**Fail if:**
- `state != 'in_progress'`
- `worktree_status != 'active'` (already mid-cleanup)
- The branch has **no new commit since it was created from staging** — i.e. the agent never committed the work. Check with:
  ```bash
  git -C <worktree_path> fetch origin staging
  git -C <worktree_path> merge-base --is-ancestor <worktree_path_commit> origin/staging
  ```
  Practical check: `git -C <worktree_path> log --oneline origin/staging..HEAD` must list at least one commit. If it is empty, the agent forgot to commit — stop and tell the user to commit the worktree changes first (the worktree also must be clean: `git -C <worktree_path> status --porcelain` should be empty before Phase 3 pushes).
- No PR exists targeting `staging` (check `gh pr list --head <branch> --base staging --json url --jq '.[0].url'`)

If any check fails, report the failure and stop. Do not proceed.

---

## Phase 1 — Identify the Task and Recover Session ID

**If a task ID or roadmap ID was supplied** (`task-complete 17` or `task-complete P2-ARCH-1`), look it up directly. This is the preferred path.

**If no ID was supplied**, look in the current conversation history first. The `task-claim` output earlier in this session will have printed `Claimed: Task #<id>`. Use that ID — do not query the database to guess.

If the task ID genuinely cannot be found in the conversation history, query only to confirm, then ask the user:

```sql
SELECT id, short_desc, worktree_path, worktree_status, state, actual_start_date, agent_id
FROM tasks
WHERE agent_id LIKE 'claude-%'
  AND state = 'in_progress'
ORDER BY actual_start_date DESC;
```

Run with: `supabase db query --linked "<SQL above>"`

Show the full list and ask: "Which task are you completing?" Do not auto-select.

Once you have a confirmed task ID, **recover your session ID**:

```bash
cat <worktree_path>/.agent-session
```

This gives you `:my_agent_id` (e.g. `claude-a3f9b2c1`). You will use it as an ownership guard in every UPDATE. If the file is missing (worktree was removed or session is being resumed), read `agent_id` directly from the task row — it is the same value.

Operate exclusively on that task ID for every remaining phase. Never read or modify any other `in_progress` task, even if others appear in the database.

---

## Phase 2 — Determine Terminal State

Read the user's signal and default without asking when it's clear:

| Signal | State | Ask anything? |
|---|---|---|
| "done", "complete", "ship it", "finished" | `done` | No — proceed |
| "blocked on X", "waiting for Y" | `blocked` | Ask "What is blocking this?" if not stated |
| "cancel", "won't do", "descope" | `cancelled` | No — proceed |

For `blocked`: record the reason clearly in `blocked_reason` — future sessions need to understand what was blocking without re-reading the full conversation.

---

## Phase 3 — Push Branch and Open PR to Staging (Done Path Only)

**Skip entirely for `blocked` and `cancelled` paths.**

### Branching Rules (Non-negotiable)

- All task branches base off `staging` and merge back to `staging`
- `main` is the production branch — only `staging` PRs into it
- Never push a task branch to `main` or create a PR targeting `main`

### Check for Uncommitted Work

```bash
git -C <worktree_path> status --porcelain
```

If there are **uncommitted changes**, stop and tell the user. Do not proceed until they are committed or explicitly discarded.

### Push Branch and Open PR

```bash
git push -u origin <branch-name>

gh pr create \
  --base staging \
  --head <branch-name> \
  --title "<short_desc>" \
  --body "$(cat <<'EOF'
## Summary
- What was done and why (1–3 bullets)

## What Changed
- key files/areas touched

## Test Plan
- [ ] Manual verification step 1
- [ ] Manual verification step 2
EOF
)"
```

### Record PR URL in History

```bash
supabase db query --linked "
INSERT INTO task_history (task_id, old_state, new_state, agent_id, notes)
VALUES (<task_id>, 'in_progress', 'in_progress', '<my_agent_id>', 'PR opened: <url>');
"
```

**This is the most important safety check in the whole workflow.** A removed worktree with uncommitted changes means lost work.

---

## Phase 4 — Prepare the Task Record for Cleanup

The `WHERE` clause includes `agent_id = '<my_agent_id>'` as an ownership guard. Since this runs after Phase 1 has recovered the session ID, the guard is now effective — if another agent owns the task, the UPDATE returns 0 rows. Stop and report the conflict if this occurs.

**Do NOT set the final state yet.** Setting `worktree_status = 'cleaning_up'` marks the task as mid-cleanup so that if the agent crashes or times out after this point, the record accurately reflects that work remains. The actual `done`/`cancelled` state is set in Phase 6, only after the worktree has been successfully removed.

```bash
supabase db query --linked "
WITH prep AS (
    UPDATE tasks
    SET worktree_status = 'cleaning_up',
        updated_at      = now()
    WHERE id = <task_id>
      AND agent_id = '<my_agent_id>'
    RETURNING id
)
SELECT id FROM prep;
"
```

If the UPDATE returns 0 rows, the ownership guard fired — another agent owns this task. Report the conflict and stop.

---

## Phase 5 — Merge PR to Staging (Done Path Only)

**Skip for `blocked` and `cancelled`.**

### Merge PR

Use **squash merge** — this is the default for this project. The repository disallows merge commits, so a `--merge` attempt will fail. Squash collapses the task branch's commits into a single clean commit on `staging` (the PR title becomes the commit message), keeping the integration branch linear and readable.

```bash
gh pr merge <pr-url> --squash --delete-branch
```

Note: `gh pr merge --squash --delete-branch` deletes the **remote** branch, but it cannot delete the **local** branch while it is still checked out by the active worktree. That is expected — the local branch is removed in Phase 8 (after the worktree is gone). If the command prints a "failed to delete local branch" warning, ignore it; verify the merge via the step below instead.

### Verify Merge Landed

```bash
git fetch origin staging
git merge-base --is-ancestor <branch-name> origin/staging
# Exit code 0 = merged successfully
```

If merge verification fails, stop and report — do not clean up.

---

## Phase 6 — Remove the Git Worktree

Only if `worktree_path` is set and `worktree_status` was `active`:

```bash
git worktree remove --force <worktree_path>
```

### On Success — Atomically Record Cleanup, Terminal State, and Actual Todos

```bash
supabase db query --linked "
WITH closed AS (
    UPDATE tasks
    SET state           = '<new_state>',
        worktree_path   = NULL,
        worktree_status = 'cleaned_up',
        actual_end_date = CASE WHEN '<new_state>' = 'done' THEN now() ELSE actual_end_date END,
        blocked_reason  = <blocked_reason_or_NULL>,
        agent_id        = CASE WHEN '<new_state>' IN ('done', 'cancelled') THEN NULL ELSE agent_id END,
        actual_todos    = '<actual_todos_jsonb>',
        updated_at      = now()
    WHERE id = <task_id>
      AND agent_id = '<my_agent_id>'
    RETURNING id
)
INSERT INTO task_history (task_id, old_state, new_state, agent_id, notes)
SELECT id, 'in_progress', '<new_state>', '<my_agent_id>', '<notes>'
FROM closed
RETURNING task_id;
"
```

**Agent action:** Before this phase, serialize your local todo list (from `todowrite` tool) as JSONB and include it as `<actual_todos_jsonb>`. This captures the final state of each todo item for audit trail. Format matches `plan_todos`:

```json
[
  {"content": "Read src/features/vendors/...", "status": "completed", "priority": "high"},
  {"content": "Modify src/features/filters/SavedFilters.tsx", "status": "completed", "priority": "high"},
  {"content": "Run: pnpm build", "status": "completed", "priority": "medium"}
]
```

Write `notes` yourself from context — a one-sentence summary of what was done or why the task was blocked/cancelled. Do not ask the user to supply this.

**`actual_todos` must contain only steps this agent actually executed** — all should be `completed`. Do not include manual/visual verification items (browser checks, theme checks); those belong to a separate workflow and are never done in this loop. If the source `plan_todos` carried a manual-check item left `pending`, drop it from `actual_todos` rather than recording a false incomplete step.

### On Failure (Path Already Gone, Permission Error)

```bash
supabase db query --linked "
UPDATE tasks SET worktree_status = 'cleanup_failed', updated_at = now() WHERE id = <task_id>;
"
```

Log a warning but continue — a cleanup failure must not block the completion. The task remains in `in_progress` state so it can be retried.

---

## Phase 6a — Sync local staging with remote (CRITICAL, Done Only)

After the worktree is removed and the PR is merged, sync the local `staging` branch to
`origin/staging`. The main worktree's `staging` is now stale — this keeps it current.

**Only run this when `new_state = 'done'`** (not blocked or cancelled).

**Never reset local staging.** Use a fast-forward merge:

```bash
git fetch origin staging
git checkout staging
git merge --ff-only origin/staging
```

If `--ff-only` fails (local staging has commits not on origin, or the branch has
diverged), report the divergence but do NOT reset. The next task can start from
`origin/staging` directly.

If `git checkout staging` fails (e.g., local changes in the main worktree), report but
do not block — the task is already merged and recorded.

---

## Phase 7 — Unblock Downstream Tasks (Done Only)

Only run this when `new_state = 'done'`. Skip entirely for `blocked` and `cancelled`.

### Find Tasks That Depended on the Just-Completed Task

```sql
SELECT td.dependent_id
FROM task_dependencies td
WHERE td.dependency_id = <task_id>;
```

Run with: `supabase db query --linked "<SQL above>"`

### For Each Dependent Task, Check If ALL Dependencies Are Now Done

```sql
SELECT d.dependency_id
FROM task_dependencies d
WHERE d.dependent_id = <dep_task_id>
  AND d.dependency_id NOT IN (SELECT id FROM tasks WHERE state = 'done');
```

**If result is empty** → all dependencies done → unblock:

```sql
UPDATE tasks SET dependencies_met = 1, updated_at = now() WHERE id = <dep_task_id> AND dependencies_met = 0;
```

### Record Unblock in History

```sql
INSERT INTO task_history (task_id, old_state, new_state, agent_id, notes)
VALUES (<dep_task_id>, 'todo', 'todo', '<my_agent_id>', 'Dependencies met — unblocked by task #<completed_task_id>');
```

---

## Phase 8 — Delete Local and Remote Branches (Mandatory Final Step)

Only after merge verification in Phase 5 succeeded:

```bash
# Local branch
git branch -D <branch-name>

# Remote branch (if not deleted by gh pr merge --delete-branch)
git push origin --delete <branch-name>
```

Then update worktree status to `cleaned_up` (already done in Phase 6 CTE, but explicit):

```sql
UPDATE tasks SET worktree_status = 'cleaned_up' WHERE id = <task_id>;
```

---

## Edge Cases

- Never complete a task in state `blocked`, `done`, or `cancelled` (already terminal).
- If `dependencies_met = 0` despite having no rows in `task_dependencies` (data inconsistency), surface this to the user and offer to fix it:
  `UPDATE tasks SET dependencies_met = 1 WHERE id = :id AND state = 'todo'`
- If the user supplies a roadmap ID that maps to a done task, tell them it is already complete and suggest `task-create` if they want to log follow-on work.
- If PR merge fails or verification fails, leave the task in `in_progress` with `worktree_status = 'active'` so the user can investigate. Do not force cleanup.