# Memory: delivery-manager
Reusable lessons only (see AGENTS.md section 9). Max 40 lines. Format: `- YYYY-MM-DD <lesson>`. Consolidate at the cap.
- 2026-11-05 backend-builder shell is deny-by-default (no curl/wget); webfetch is the allowed fallback for simple URL fetches.
- 2026-11-05 File-mutating shell ops (cp/mv/mkdir/git mv/git rm/git checkout) are denied for all agents here; builders get nothing. Only git bookkeeping (add/commit/worktree add) + dedicated read/write/edit tools work. Use `git add <specific paths>` — a broad `git add specs` swept others' untracked briefs into a commit.

