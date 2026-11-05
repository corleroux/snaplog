# Board
human_gates: exception-only
max_parallel_builders: 3
last_task_id: T-001

## Feature: archive-hackathon-2026-11 | status: merged | branch: feature/archive-hackathon-2026-11 | integration: .worktrees/feature-archive-hackathon-2026-11
### T-001 Archive hackathon docs into archive/hackathon-2026-11/ | status: merged | risk: R0 | lane: backend
- depends_on: none
- covers: AC-01, AC-02, AC-03
- worktree: (removed)  branch: task/T-001
- attempts: fix_cycles=0 replans=0
- verdicts: qa=n/a code=n/a design=n/a
- notes: done after permission grant; WIP snapshot 06907f1; archive merge 0aef6b6; untracked feedback/project/renders moved on disk (never committed); see digest 2026-11-06

## Feature: adhoc-curl | status: intake | branch: (none) | integration: (none)
### T-000 ad-hoc diagnostic: backend-builder to fetch example.com | status: merged | risk: R0 | lane: backend
- depends_on: none
- covers: none (ad-hoc, no ACs)
- worktree: none (read/report only)
- attempts: fix_cycles=0 replans=0
- verdicts: qa=n/a code=n/a design=n/a
- notes: curl blocked by builder shell permissions; webfetch used instead; output delivered to human
