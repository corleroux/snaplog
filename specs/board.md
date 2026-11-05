# Board
human_gates: exception-only
max_parallel_builders: 3
last_task_id: T-001

## Feature: archive-hackathon-2026-11 | status: building | branch: feature/archive-hackathon-2026-11 | integration: .worktrees/feature-archive-hackathon-2026-11
### T-001 Archive hackathon docs into archive/hackathon-2026-11/ | status: escalated | risk: R0 | lane: backend
- depends_on: none
- covers: AC-01, AC-02, AC-03
- worktree: .worktrees/T-001  branch: task/T-001
- attempts: fix_cycles=0 replans=0
- verdicts: qa=n/a code=n/a design=n/a
- notes: BLOCKED at BUILD by tool permissions (no file-mutating shell op for agents). Branch/worktrees/specs ready; see specs/escalations/2026-11-05-T-001.md for script + options A/B. Next: human runs script or grants shell access.

## Feature: adhoc-curl | status: intake | branch: (none) | integration: (none)
### T-000 ad-hoc diagnostic: backend-builder to fetch example.com | status: merged | risk: R0 | lane: backend
- depends_on: none
- covers: none (ad-hoc, no ACs)
- worktree: none (read/report only)
- attempts: fix_cycles=0 replans=0
- verdicts: qa=n/a code=n/a design=n/a
- notes: curl blocked by builder shell permissions; webfetch used instead; output delivered to human
