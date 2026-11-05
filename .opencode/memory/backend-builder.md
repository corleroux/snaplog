# Memory: backend-builder
Reusable lessons only (see AGENTS.md section 9). Max 40 lines. Format: `- YYYY-MM-DD <lesson>`. Consolidate at the cap.
- 2026-11-05 backend-builder subagent: `shell` returns Permission denied and execute exposes no shell/git; verify tool availability (one echo) before planning any git-mv task, else report BLOCKED fast with exact commands.
- 2026-11-06 shell access granted via ask-gate: run cp/git-mv with workdir=.worktrees/T-001 so relative dest paths resolve in worktree; split add/commit into separate shell calls for clean hashes.
- 2026-11-06 `diff -q` prints nothing when identical: chain `&& echo IDENTICAL:$f` in loop to get explicit proof; `git restore <dir>` clears tracked WIP without touching unstaged deletes elsewhere.

- 2026-11-06 Archive gitignored mv: verify with ls -d pre-check, mv per dir, rmdir cleanup; STOP on tracked M in status even if unrelated.
