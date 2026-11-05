# Board
human_gates: exception-only
max_parallel_builders: 3
last_task_id: T-000

## Feature: adhoc-curl | status: intake | branch: (none) | integration: (none)
### T-000 ad-hoc diagnostic: backend-builder to fetch example.com | status: building | risk: R0 | lane: backend
- depends_on: none
- covers: none (ad-hoc, no ACs)
- worktree: none (read/report only)
- attempts: fix_cycles=0 replans=0
- verdicts: qa=n/a code=n/a design=n/a
- notes: ad-hoc human request; builder permissions deny `curl`, webfetch allowed
