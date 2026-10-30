---
name: task-run
description: Run the complete task lifecycle end-to-end for a single task — from a natural-language request (create) or an existing task id, through plan, claim, code, and squash-merge to staging. Use when the user wants one command to "do a task", "run task (by id)", "create and ship", "take this from idea to staging", or otherwise drive task-create → task-plan → task-claim → task-complete as one continuous flow. Encodes the worktree-reset, pnpm-install, build-not-lint, squash-merge, blocked-spawns-unblocker, unrecoverable-rollback-to-cancelled, and no-manual-verification-todo rules derived from a real end-to-end run.
compatibility: Requires the Supabase CLI (supabase), git, the GitHub CLI (gh), pnpm, and Python 3. Builds with `pnpm build` inside a git worktree.
---

# task-run

Drives one task through the entire lifecycle in a single continuous flow, ending in a
squash-merged, cleaned-up commit on `origin/staging`:

```
[create] → plan → claim → code → complete (squash merge to staging)
```

This skill does NOT re-implement the lifecycle steps. It sequences the existing skills
(`task-create`, `task-plan`, `task-claim`, `task-complete`) and enforces the operational
rules they document but do not chain together. It encodes lessons from a real end-to-end
run (task #78 → PR #84 → `origin/staging`).

**Two entry points:**
- **Natural-language request** → start at `task-create` (Phase 0A), then plan onward.
- **Existing task id / roadmap id** (`task-run 44`, `task-run P2-FEAT-1`) → start at
  `task-plan` (Phase 0B), even if the task was planned before (re-plan to refresh against
  current code).

---

## Operating assumptions (set from the reference run)

- **Fully autonomous through merge.** Plan → claim → write code → verify with `pnpm build`
  → commit → complete (squash-merge). No human checkpoint after creation.
- **One real task per invocation.** Do not batch.
- **Authoritative gate is `pnpm build`** (tsc + vite). **`pnpm lint` is BANNED as a gate**
  — the repo's flat ESLint config reports ~12k pre-existing config-level errors repo-wide;
  a lint failure is noise.
- **Manual/visual verification is OUT of scope.** Never create, carry, or record todo
  items for browser/theme/visual checks in `plan_todos` or `actual_todos`.
- **The task audit trail is the source of truth for process effectiveness.** Keep it
  coherent: the initial request (Overview/Description), the plan saved during planning,
  the implementation notes from claim, and the close-out notes from complete must all be
  written back to the task. When in doubt, write more context to the task row / history.
- **Multi-line SQL** goes through `supabase db query --linked --file <path>` (inline long
  SQL can time out ~120s).

---

## Phase 0 — Resolve the task

### 0A — Create from a natural-language request

Invoke `task-create` with the user's input. `task-create` will:
- Check for duplicates and ask up to 3 clarifying questions if the input is thin.
- Present the proposed task (summary, type, priority, delivery mode, dependencies,
  context) and **WAIT for the user to confirm before writing to the DB**. This is the
  ONLY checkpoint in the flow.
- On approval, write the row and return a new task id.
- If the delivery mode is `manual`, `task-create` stops (no agent code possible) — print
  "Manual task #<id> created — a human must perform the external action. No agent
  execution." and end the run.

Continue with the new id into Phase 1.

### 0B — Run an existing task

The user supplies a task id or roadmap id. Validate it exists and is `todo` with
`dependencies_met = 1`. If not, explain and stop (same precondition `task-claim` Phase 1
enforces). Then go straight to Phase 1 (`task-plan`), re-planning even if `plan_status`
is already `ready` — code may have changed since the last plan.

---

## Phase 1 — Plan (`task-plan`)

Invoke `task-plan <id>` (or `task-plan --replan <id>` for an already-planned task).

- If `task-plan` returns **ambiguous / needs_discovery**: stop and surface its reason.
  The human must resolve it before this flow can continue. Do not claim.
- If `plan_status = 'ready'`: continue to Phase 2.

The plan's verification step should already specify `pnpm build` (task-plan enforces
this). If the plan instead named `pnpm lint` as the gate, override it locally to
`pnpm build` — lint is not a valid gate in this repo.

---

## Phase 2 — Claim (`task-claim`)

Invoke `task-claim <id>`. It atomically claims the task and, in Phase 4, creates the
isolated git worktree:

1. `git worktree add -b task/<id>/<slug> ../worktrees/<project>-task-<id> staging`
2. `git -C <worktree_path> fetch origin staging && git -C <worktree_path> reset --hard origin/staging`
   — critical: the worktree starts from a clean, current `staging`, uncontaminated by the
   main worktree.
3. `pnpm install` **inside the worktree** (fresh worktree has no `node_modules`).
4. Writes `<worktree_path>/.agent-session` and records the path in the DB.

`task-claim` then prints the work brief and **begins executing immediately**. All
subsequent code changes happen in `<worktree_path>` — never on `staging` in the main
worktree.

---

## Phase 3 — Execute the plan (code)

Drive the `plan_todos` from the brief using the `todowrite` tool, working only inside
`<worktree_path>`:

- Read files, make edits, create files per the plan.
- **No manual/visual verification todos.** If the plan (or your own todos) would add a
  "verify in browser" / "check the theme" item, drop it — it is not agent-executable.
- Update `todowrite` statuses as you go (`in_progress` → `completed`).

### Verification gate — `pnpm build`

After the edits, run inside the worktree:

```bash
cd <worktree_path> && pnpm build
```

- Expect: zero TypeScript / vite errors. This is the authoritative check.
- On failure: read the error, fix the code in the worktree, rebuild. **Up to 3 attempts.**
  After the 3rd failed attempt, escalate — stop and raise a `manual` P0 task (see Phase 5
  failure handling) with the last build error and the diff, then stop the run. Do NOT
  proceed to commit with a broken build.

---

## Phase 4 — Commit in the worktree

Once `pnpm build` is green, commit the worktree changes (required before `task-complete`
will proceed — its Phase 0 refuses to run with no commit on top of `origin/staging` or a
dirty tree):

```bash
git -C <worktree_path> add -u
git -C <worktree_path> commit -m "<short_desc>"
git -C <worktree_path> status --porcelain   # must be empty
```

`git add -u` stages all changes to **tracked** files, including files regenerated by git
hooks (e.g., graphify artifacts). This keeps the system consistent — hooks run on every
code change and their output should be committed alongside the intentional changes.

If the task created **new files** that should be part of the commit (e.g., a new component),
add them explicitly after `git add -u`:

```bash
git -C <worktree_path> add -u
git -C <worktree_path> commit -m "<short_desc>"
git -C <worktree_path> status --porcelain   # must be empty
```

`git add -u` stages all changes to **tracked** files, including files regenerated by git
hooks (e.g., graphify artifacts). This commits hook output alongside intentional changes,
keeping the system consistent. Do NOT use `git add -A` (would also stage new untracked
files that may be temporary artifacts).

If the task created **new files** that should be part of the commit (e.g., a new component),
add them explicitly after `git add -u`:

```bash
git -C <worktree_path> add -u
git -C <worktree_path> add <path/to/new/file>
git -C <worktree_path> commit -m "<short_desc>"
```

The commit message is an intermediate one; the squash merge will use the PR title as the
final message on `staging`.

---

## Phase 5 — Complete (`task-complete`)

Invoke `task-complete <id>`. It:

1. Phase 0 — validates a real commit on top of `origin/staging` and a clean tree.
2. Phase 3 — pushes the branch and opens a PR to `staging`.
3. Phase 5 — **squash-merges** the PR (`gh pr merge --squash --delete-branch`) and
   verifies it landed on `origin/staging`.
4. Phase 6 — removes the worktree, records `done` + `actual_todos` (agent-executed steps
   only, no manual checks).
5. Phase 7 — unblocks downstream `todo` tasks that depended on this one.
6. Phase 8 — deletes the local and remote branches.

### Blocked path — blocked is a terminal state, but it MUST spawn an unblocker first

If during execution the task becomes blocked (cannot proceed without external work),
this is an END state like `done`. Before `task-complete` may mark it `blocked`:

1. First **create a follow-on task** via `task-create` describing exactly what must happen
   to unblock it — this can be a `code` or `manual` task. Record its id.
2. Add that new task as a dependency / block reference so there is visibility (set the
   blocked task's `dependencies` relationship or note the unblocker in `blocked_reason`).
3. Only then invoke `task-complete <id>` with the `blocked` signal, recording the unblocker
   task id in `blocked_reason` (e.g. "Blocked on #<new_id>: <what must happen>").
4. `task-complete` records `blocked` and stops — no PR, no merge, no worktree cleanup
   removal of the branch (worktree can be cleaned up but the task stays `blocked`).

A blocked task without a corresponding unblocker task is a process violation — never mark
a task blocked without first creating the unblocker.

---

## Phase 5a — Sync local staging with remote (CRITICAL)

After `task-complete` finishes, the local `staging` branch is stale — `origin/staging` was
updated by the squash-merge but the local branch still points to the old commit. This
step ensures they stay in sync so the next task starts from a current base.

**Only run this when the task was completed as `done`** (not blocked or cancelled).

**Never reset local staging.** Use a fast-forward merge so any local-only commits are
preserved:

```bash
git fetch origin staging
git checkout staging
git merge --ff-only origin/staging
```

If `--ff-only` fails (local staging has commits not on origin, or the branch has
diverged), it means there is local work that hasn't been pushed. Report the divergence
in the summary but do NOT reset. The next task can start from `origin/staging` directly.

If `git checkout staging` fails (e.g., local changes in the main worktree), report the
blocker but do NOT block completion. The task is already merged.

---

## Phase 6 — Failure handling and recovery

**Prefer forward recovery.** When a failure occurs, the skill should attempt to recover in
a forward direction (e.g. resolve and document a merge conflict rather than aborting).
Document every recovery action in `task_history` so the audit trail is complete.

| Failure point | Forward recovery | If unrecoverable |
|---|---|---|
| `task-create` duplicate found | Offer existing task; stop if user confirms | — |
| `task-plan` ambiguous / needs_discovery | Stop; surface reason; human must resolve | Stop the run |
| `task-claim` race collision / already owned | Stop; report owner | Stop the run |
| Merge conflict on PR merge | Resolve conflict in worktree, document in history, re-push, re-merge | Rollback + cancel |
| `pnpm build` fails | Fix + rebuild (max 3 attempts) | Raise `manual` P0 task with error + diff; stop |
| `task-complete` uncommitted/clean-tree guard | Commit the worktree first, then re-run | Rollback + cancel |
| Any other precondition guard | Report clearly; attempt safe recovery | Rollback + cancel |

**Unrecoverable failure → rollback and cancel.** If the skill cannot recover from any
failure, it MUST:
1. Roll back ALL code changes immediately (remove the worktree / reset the branch; never
   leave partial commits on `staging` — the squash merge only happens after a verified
   build, so `staging` is never touched before a clean merge).
2. Attach a detailed report to the task (what failed, the attempted recoveries, the final
   error/diff) via `task_history`.
3. Move the task to **`cancelled`** via `task-complete <id>` (cancelled path).

**Raise-a-concern task.** Whenever the skill encounters a concern it cannot fully resolve
on its own — a flaky build, an unclear plan assumption, a suspicious schema state — it
MUST raise a `manual` task at **P0** with as much detail as possible (what, where, the
exact error/output, and the proposed next action). This keeps issues visible instead of
swallowed.

---

## Phase 7 — Report

Print a one-block summary for the human:

---
**task-run complete: Task #<id> — "<short_desc>"**
- Created: [yes (confirmed with user) / used existing]
- Plan: ready (risk <plan_risk>, <plan_step_count> steps)
- Worktree: <worktree_path> (cleaned up)
- Build: `pnpm build` green
- Merged: squash-merged to `origin/staging` via PR #<n>
- Unblocked: [dependent task ids, or "none"]

Next: `task-claim` / `task-run` the next task, or review downstream unblocks.
---

For a non-`done` end state, adjust the summary:
- **Blocked:** "...Blocked on #<unblocker_id>: <reason>. Unblocker task created."
- **Cancelled:** "...Rolled back and cancelled. Report attached. Concern task: #<p0_id>."

---

## What this skill does NOT do

- Does not batch multiple tasks in one run.
- Does not run `pnpm lint` as a gate.
- Does not create or carry manual/visual verification todos.
- Does not merge to `main` (only `staging` → `main` happens in a separate release PR).
- Does not leave partial commits on `staging` (merge only after a verified build).
- Never resets local `staging` — uses `--ff-only` or reports divergence.
- Does not leave local `staging` out of sync with `origin/staging` (syncs after every `done` completion).
- Does not mark a task `blocked` without first creating its unblocker task.
- Does not swallow concerns — it raises a `manual` P0 task for anything it cannot resolve.
