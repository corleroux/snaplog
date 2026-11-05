# Team Operating Rules

Applies to **every** agent. Role-specific behaviour lives in `.opencode/agents/<role>.md`.
If a role file and this file conflict, this file wins.

## 1. Stack (edit to match the repo)
- TypeScript, React, Tailwind, shadcn/ui (Capacitor for mobile shells where present)
- Supabase (Postgres, Auth, Edge Functions, Storage, Realtime); Modal for GPU/batch jobs
- Playwright for end-to-end tests
- Package manager: `npm`. Required scripts in `package.json`: `typecheck`, `lint`, `test`, `test:e2e`, `build`
- Design system source of truth: `docs/design-system.md`

## 2. Roles
| Role | Agent name | Mode | Writes |
| --- | --- | --- | --- |
| Product owner | `product-owner` | all (human can talk to it) | `specs/<f>/brief.md`, `criteria.md`, `acceptance.md` |
| Architect/planner | `architect` | subagent | `specs/<f>/plan.md`, `contract/**`, `specs/decisions.md` |
| Delivery manager | `delivery-manager` | primary (default) | `specs/board.md`, `specs/digest/**`, `specs/escalations/**`, merges |
| Backend builder | `backend-builder` | subagent | code in task worktree, `specs/<f>/reports/` |
| Frontend builder | `frontend-builder` | subagent | code in task worktree, `specs/<f>/reports/` |
| QA (Playwright) | `qa-engineer` | subagent | `tests/e2e/**` in task worktree, `specs/<f>/verdicts/`, `evidence/` |
| Design reviewer | `design-reviewer` | subagent (read-only) | `specs/<f>/verdicts/` |
| Code reviewer | `code-reviewer` | subagent (read-only) | `specs/<f>/verdicts/` |

Only `delivery-manager` may invoke other agents. Subagents never invoke each other.

## 3. Where state lives
```
specs/
  board.md                       # delivery-manager only
  decisions.md                   # architect appends (D-001, D-002 ...)
  digest/YYYY-MM-DD.md           # delivery-manager
  escalations/<date>-<id>.md     # delivery-manager
  <feature>/
    brief.md  criteria.md        # product-owner
    plan.md                      # architect
    reports/T-xxx-build.md       # builders
    verdicts/T-xxx-<role>-<n>.md # qa-engineer, code-reviewer, design-reviewer
    evidence/T-xxx/              # screenshots, traces (qa-engineer)
    acceptance.md                # product-owner
contract/                        # architect only: shared types/schemas/OpenAPI
docs/design-system.md            # maintained by human/architect
.opencode/memory/<role>.md       # per-agent lessons (see section 9)
.worktrees/<task-id>/            # gitignored: one git worktree per task
.worktrees/feature-<slug>/       # gitignored: integration worktree per feature
```
**Rule:** orchestration state (specs, verdicts, reports, board, memory) is read and written in the
**main checkout at the repo root** using root-relative paths. **Code** is read and written only inside
the task's worktree. Never read specs from a worktree copy: it may be stale.

## 4. Task lifecycle
`intake → briefed → planned → tests-written → building → verifying → verified → merged`
Side states: `blocked`, `escalated`, `abandoned`.
Task IDs are `T-001`, `T-002` ... (never reused). Feature slugs are kebab-case.

## 5. Risk tiers
| Tier | Meaning | Gates |
| --- | --- | --- |
| R0 | Copy, styling, docs, config with no behaviour change | QA smoke (if UI) + design review (if UI). No code review. PO acceptance batched. |
| R1 | Normal feature or bug fix | QA + code review + design review (if UI). PO acceptance per feature. |
| R2 | Touches contract (breaking), auth, RLS, migrations that drop or rewrite data, spend/billing, secrets, infra/deploy, anything irreversible | All R1 gates **plus human approval before merge**. |

Product owner proposes the tier, architect confirms. When unsure, choose the higher tier.

## 6. Autonomy dial (set in `specs/board.md` header)
`human_gates: exception-only | plan | merge | plan+merge` (default `exception-only`)
- `exception-only`: the team gatekeeps itself; the human is pulled in only by section 8 triggers.
- `plan`: human approves `plan.md` before building. `merge`: human approves before merge to main.
- R2 always requires human approval before merge regardless of the dial.

## 7. Definition of done (task)
All of: QA tests tagged to every assigned AC pass with no flakes; no unexpected console errors or failed
requests; code review PASS (R1/R2); design review PASS (UI tasks); `contract/` unchanged or change logged in
`specs/decisions.md`; typecheck, lint and unit tests green; build report present.
Feature done = all tasks done + product-owner `ACCEPTED` (R1/R2).

## 8. Escalation triggers (the only times the human is interrupted)
1. Product owner returns `NEEDS_HUMAN` (genuine product trade-off).
2. A task fails the same gate after the full retry protocol (section 10).
3. Anything R2.
4. Two verifiers give contradictory findings on the same code.
5. Any agent hits a `BLOCKED` it cannot resolve (missing credentials, missing design system, tool failure).
6. A permission prompt (`ask`) appears: spend or deploy action. The human decides.

## 9. Memory protocol (all agents)
Each agent owns `.opencode/memory/<role>.md`.
- **Start of work:** read your memory file.
- **End of work:** if you learned a *reusable* lesson (a recurring failure, a project quirk, a command that
  works, a trap), append one line: `- YYYY-MM-DD <lesson, <= 200 chars>`. Never log task-specific narrative.
- **Cap:** 40 lines. At the cap, consolidate duplicates and delete stale lines before adding.
- Verifier memory records *recurring defect patterns*; the delivery manager promotes a pattern that appears
  3+ times to a proposed `AGENTS.md` rule in the digest (the human approves rule changes).
- Memory is advice, never authority: if it conflicts with `AGENTS.md` or the task, those win.

## 10. Retry and failure protocol
- A **fix cycle** = builder FIX → re-run QA → re-run only the gates that previously failed.
- Max **2 fix cycles** per task. Then architect **REPLAN** (once per task). Then max **2 more fix cycles**.
- Still failing → `escalated`, with a one-page escalation file. No further attempts without a human decision.
- A builder that disagrees with a finding says so with evidence. The delivery manager re-invokes the verifier
  once with the dispute. If the verifier holds, the builder complies.

## 11. Evidence rules (verdicts)
Verdict files use exactly this shape:
```
# Verdict: <ROLE> on T-xxx (run <n>)
VERDICT: PASS | FAIL | BLOCKED
Summary: <= 3 lines
## Findings
- [BLOCKER|MAJOR|MINOR|NIT] F-<n> <title> — path/to/file.ts:LINE or evidence/T-xxx/shot.png — <what is wrong> — <what good looks like>
## Checked (what you actually ran/looked at)
- ...
```
- PASS requires **zero BLOCKER and zero MAJOR**. MINOR/NIT never fail a task.
- A finding without a file:line or evidence path is invalid and must not be counted.
- A PASS must list what was actually checked. "Looks good" is not evidence.
- Authors never verify their own work. Verifiers are read-only on application code.

## 12. Git rules
- Branches: `feature/<slug>` (integration), `task/T-xxx` (per task, created from the feature branch).
- Commits: `T-xxx: <imperative summary>`. Small and frequent.
- **Nobody pushes, force-pushes, resets hard, or cleans.** The human pushes.
- Only `delivery-manager` merges.

## 13. Subagent response format (keep context small)
Final message to the caller is at most 15 lines: `STATUS: <enum>`, the paths you wrote, blockers.
Detail goes in files, not in the reply.

## 14. Step-limit behaviour
If you are told you are at your step limit, stop starting new work. Write what is done, what is left and the
exact next step to `specs/<feature>/reports/T-xxx-handoff.md` (or your normal output file), commit WIP, and
reply `STATUS: STEP_LIMIT`.

## 15. Hard prohibitions
Never read or print secrets or `.env*` files. Never commit secrets. Never weaken, skip, delete or special-case
a test to make it pass. Never edit another role's files. Never invent API shapes: the contract is the source
of truth.
