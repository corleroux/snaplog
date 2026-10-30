---
name: task-quick
description: |
  Fast-track workflow for trivially small, well-understood code changes — the kind
  you'd fix in 2 minutes without thinking. Use this when the change touches ≤2 files,
  has no planning ambiguity, and doesn't need worktree isolation (e.g., renaming a
  variable, fixing a typo, updating a constant, adding a simple conditional, tweaking
  CSS, changing a label, or any change where the implementation is obvious).

  This is also the skill to reach for when you're about to use task-run but the work
  feels too small for the full lifecycle — this gives you the same task tracking, PR,
  and merge automation without the overhead of planning and worktree creation.

  The workflow: auto-create task (no confirmation) → lightweight branch (no worktree)
  → code → build → commit → PR → squash-merge → sync local staging with remote.

  Always ends with syncing the local staging branch to origin/staging so the repo
  never drifts.
---

# task-quick

Fast-track task lifecycle for trivially small changes. Cuts four overheads from the full
`task-run` flow: no user confirmation at creation, no planning phase, no worktree, and no
separate `pnpm install`. The result is the same — a tracked, built, PR'd, and merged change
to `origin/staging` — in roughly half the wall time.

---

## Operating assumptions

- **Fully autonomous through merge.** No human checkpoints. Task creation is automatic.
- **Only for trivially small changes.** If during execution you discover the change is
  complex (touches >2 files, requires cross-module type changes, needs careful thought),
  abort and fall back to the full `task-run` workflow. Honest assessment is better than
  forcing a bad fit.
- **No worktree isolation.** The lightweight branch shares the working tree with whatever
  else is happening in the repo. Background processes (graphify hooks, test watchers,
  other agents) can modify the working tree during execution. Phase 0a checks for a
  clean start, and Phase 3a stages intentionally — but concurrent agents should avoid
  this skill in favour of `task-run` with worktree isolation.
- **Authoritative gate is `pnpm build`.** `pnpm lint` is noise — the repo's flat ESLint
  config reports ~12k pre-existing errors. Do not gate on lint.
- **Manual/visual verification is OUT of scope.** No browser checks, theme checks, or
  manual QA todos. Keep todos to agent-executable steps only.
- **Local staging must always match remote.** A key design constraint: the skill ends
  by syncing the local `staging` branch to `origin/staging`.

---

## Phase 0 — Pre-flight check and task creation

### 0a — Pre-flight: verify working tree is clean

Before touching anything, check that the working tree has no uncommitted changes that
could leak into the task branch:

```bash
git status --porcelain
```

**If there are modified tracked files** (not just ignored/generated files like `node_modules/`,
`dist/`, `graphify-out/`): stop and report. Explain that the working tree has uncommitted
changes and the user should commit or stash them first. This is a safety guard — the
lightweight branch approach shares the working tree with other work.

**If the working tree is clean:** proceed.

### 0b — Check that we're on a valid branch

```bash
git branch --show-current
```

If the current branch is `main`, `HEAD` (detached), or anything other than `staging` or
a previous task branch (`task/*`), warn that the skill expects to work from a staging-base
context but proceed anyway (the Phase 1c `git checkout staging` will handle it).

### 0c — Auto-create the task

Create a task row with minimal fields. Unlike `task-run`, this is fully automatic — no
user confirmation, no clarifying questions, no dependency checking. The task exists
solely for audit trail and PR automation.

**Generate the task content yourself** from the user's natural-language request:

- `short_desc`: ≤12 words, imperative, starting with a verb
- `detailed_desc`: 2–3 sentences — what changed and why. Do not write a plan.
- `classification`: infer from the work
- `priority`: infer from impact
- `delivery_mode`: `'code'` (always — this skill is for code changes)
- `dependencies_met`: 1

**Write to the DB:**

```bash
supabase db query --linked --file /tmp/task_create_quick.sql
```

Where `/tmp/task_create_quick.sql` contains:

```sql
WITH new_task AS (
    INSERT INTO tasks (
        short_desc, detailed_desc, classification, priority,
        state, dependencies_met, delivery_mode
    ) VALUES (
        '<short_desc>', '<detailed_desc>', '<classification>', '<priority>',
        'todo', 1, 'code'
    )
    RETURNING id
)
INSERT INTO task_history (task_id, old_state, new_state, agent_id, notes)
SELECT id, NULL, 'todo', 'quick-creator', 'Task created (quick path)'
FROM new_task
RETURNING task_id;
```

The `agent_id` value `'quick-creator'` distinguishes quick-path tasks from full `task-run`
tasks in the audit trail.

**Verify and capture the id:**

```bash
supabase db query --linked "SELECT id, short_desc, state FROM tasks ORDER BY id DESC LIMIT 1;"
```

Store the returned `task_id` as `:task_id`. Proceed immediately to Phase 1.

---

## Phase 1 — Claim with lightweight branch

No worktree, no `pnpm install`. Create a git branch from `staging` inside the main
checkout and atomically claim the task.

### 1a — Generate a session ID

```bash
python3 -c "import secrets; print('quick-' + secrets.token_hex(4))"
```

This produces a value like `quick-a3f9b2c1`. Store it as `:my_agent_id`.

### 1b — Atomic claim

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
SELECT id, 'todo', 'in_progress', '<my_agent_id>', 'Task claimed (quick path)'
FROM claimed;
"
```

**Verify the claim landed:**

```bash
supabase db query --linked "SELECT id, state, agent_id FROM tasks WHERE id = <task_id>;"
```

If `state != 'in_progress'` or `agent_id != '<my_agent_id>'`, another agent claimed it
between the insert and now — report collision and stop.

### 1c — Create the lightweight branch

Create the task branch directly from `origin/staging`. Never checkout or reset the local
`staging` branch — it may have local-only commits that should be preserved.

```bash
git fetch origin staging
git checkout -b task/<task_id>/<slug> origin/staging
```

**If `git fetch` fails** (no network): fall back to creating the branch from local state:

```bash
git checkout -b task/<task_id>/<slug> staging
```

Note in `task_history` that the branch was created from local staging (may be stale).

Derive slug from `short_desc`: lowercase, hyphens, ≤30 chars.

**Branch naming examples:**
- "Fix typo in welcome message" → `task/84/fix-typo-welcome-message`
- "Update login button color" → `task/85/update-login-button-color`

### 1d — Write the session file (no worktree path in DB since there's no worktree)

```bash
echo "<my_agent_id>" > .agent-session
```

---

## Phase 2 — Execute the change

Work directly in the current directory (the main checkout, now on the task branch).

- Read the file(s) that need changing
- Make the edit using the `edit` tool
- Update `todowrite` as you go

### Verification gate — `pnpm build`

After the edits:

```bash
pnpm build
```

- Expect: zero TypeScript / vite errors.
- On failure: fix and rebuild. **Up to 3 attempts.**
- After 3rd failure: stop, raise a `manual` P0 concern task with the last error + diff,
  then cancel this task. Do not commit a broken build.

---

## Phase 3 — Commit

Once `pnpm build` is green:

### 3a — Stage all tracked changes (including hook-generated)

Git hooks run on every code change and regenerate files like graphify artifacts. These
are tracked files that must be committed to keep the system consistent:

```bash
git add -u
```

`git add -u` stages all changes to **tracked** files — both your intentional edits and
any files regenerated by hooks. Do NOT use `git add -A` (would also stage new untracked
files that may be temporary).

If the task created **new files** that should be part of the commit (e.g., a new
component), add them explicitly after `git add -u`:

```bash
git add -u
git add <path/to/new/file>
```

### 3b — Commit

```bash
git commit -m "<short_desc>"
git status --porcelain   # must be empty
```

If `git status` shows untracked files that are gitignored (e.g., `node_modules/`,
`dist/`), they are fine. If it shows uncommitted tracked files, they were modified
after the commit — investigate and decide whether to include them or revert them.

---

## Phase 4 — Complete

### 4a — Push the branch

```bash
git push -u origin task/<task_id>/<slug>
```

**If push fails with "rejected"** (branch already exists on remote from a previous
attempt): delete the remote branch first (`git push origin --delete
task/<task_id>/<slug>`) and retry.

**If the change is already on origin/staging** (e.g., another agent already made the
same fix): detect this before creating a PR. If `git diff origin/staging -- <your
file>` shows no diff, the change is already deployed. In this case:
1. Do NOT create a PR (it would be empty).
2. Delete the local branch (`git checkout staging && git branch -D
   task/<task_id>/<slug>`).
3. Sync local staging (`git reset --hard origin/staging`).
4. Close the task as `done` with a note: "Change already present on origin/staging,
   no PR needed."
5. Skip to Phase 4e (close out the task) — do not run 4b–4d.

### 4b — Open a PR to staging

```bash
PR_URL=$(gh pr create \
  --base staging \
  --head task/<task_id>/<slug> \
  --title "<short_desc>" \
  --body "## Summary\\n<what was done and why>\\n\\n## What Changed\\n<files/areas touched>")

echo "PR: $PR_URL"
```

Record the PR in task history:

```bash
supabase db query --linked "
INSERT INTO task_history (task_id, old_state, new_state, agent_id, notes)
VALUES (<task_id>, 'in_progress', 'in_progress', '<my_agent_id>', 'PR opened: <PR_URL>');
"
```

### 4c — Squash-merge the PR

```bash
gh pr merge "$PR_URL" --squash --delete-branch
```

Verify the merge landed:

```bash
git fetch origin staging
```

### 4d — Sync local staging with remote (CRITICAL)

This step ensures local `staging` tracks `origin/staging` without overwriting local
commits. Never reset local staging — use a fast-forward merge:

```bash
git fetch origin staging
git checkout staging
git merge --ff-only origin/staging
```

If `--ff-only` fails (local staging has commits not on origin), report the divergence
but do NOT reset. The next task can start from `origin/staging` directly.

Then clean up the task branch:

```bash
git branch -D task/<task_id>/<slug>
```

### 4e — Close out the task in the DB

Serialize your `todowrite` todos as JSONB and record completion:

```bash
supabase db query --linked "
WITH closed AS (
    UPDATE tasks
    SET state           = 'done',
        actual_end_date = now(),
        agent_id        = NULL,
        actual_todos    = '<actual_todos_jsonb>'::jsonb,
        updated_at      = now()
    WHERE id = <task_id>
      AND agent_id = '<my_agent_id>'
    RETURNING id
)
INSERT INTO task_history (task_id, old_state, new_state, agent_id, notes)
SELECT id, 'in_progress', 'done', '<my_agent_id>', '<notes>'
FROM closed
RETURNING task_id;
"
```

### 4f — Unblock downstream tasks

```sql
SELECT td.dependent_id
FROM task_dependencies td
WHERE td.dependency_id = <task_id>;
```

For each dependent, check ALL its dependencies are done. If so, set
`dependencies_met = 1`. Record the unblock in `task_history`.

---

## Phase 5 — Failure handling and recovery

Same philosophy as `task-run`: prefer forward recovery, document everything.

| Failure point | Forward recovery | If unrecoverable |
|---|---|---|---|
| Working tree dirty at start | Report what files are dirty; ask user to commit/stash | Stop |
| Generated artifacts in staging diff | Stage only intentional files (see 3a); revert generated ones | Cancel if unsure what changed |
| Claim race collision (already owned) | Stop; report owner | Stop |
| `pnpm build` fails | Fix + rebuild (max 3 attempts) | Raise `manual` P0 concern, cancel task |
| Push rejected (branch exists) | Delete remote branch, re-push | — |
| Change already on origin/staging | Skip PR; close task as done (see 4a) | — |
| Merge conflict on PR merge | Resolve in branch, re-push, re-merge | Rollback + cancel |
| Merge verification fails | Retry merge; inspect if branch was already merged | Rollback, leave task `in_progress` |
| Git branch name collision | Append random suffix | — |

**Unrecoverable → rollback and cancel:**
1. `git checkout staging && git reset --hard origin/staging` (discard branch)
2. `git branch -D task/<task_id>/<slug>` (if it exists and wasn't deleted)
3. Attach report to task via `task_history`
4. Move task to `cancelled`

---

## Phase 6 — Report

Print a one-block summary:

```
━━ task-quick complete: Task #<id> — "<short_desc>" ━━
  Created: auto
  Branch: task/<id>/<slug>
  Build: pnpm build green
  Merged: squash-merged to origin/staging via PR #<n>
  Local staging: synced to origin/staging
  Unblocked: [dependent task ids, or "none"]
```

---

## What this skill does NOT do

- Does not plan or create `plan_todos` / `detailed_desc` plans
- Does not create worktrees or run `pnpm install`
- Does not ask the user to confirm task creation
- Does not batch multiple tasks in one run
- Does not run `pnpm lint` as a gate
- Does not create or carry manual/visual verification todos
- Does not auto-exclude generated artifacts from commits (you must stage intentionally in Phase 3a)
- Does not merge to `main` (only `staging`)
- Does not worktree-isolate changes — concurrent agents touching the same files will conflict
- Does not leave local `staging` out of sync with `origin/staging`
