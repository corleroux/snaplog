# opencode team (9 roles, opencode V2 format)

Product owner, architect, delivery manager, backend builder, frontend builder, QA (Playwright), design reviewer,
code reviewer, researcher. Gates rest on evidence rather than on you approving everything; you are pulled in by
exception.

## Layout
```
AGENTS.md                         shared rules (every agent reads it)
opencode.jsonc                    global config + global permissions
.opencode/agents/<role>.md        one file per agent (V2 `permissions` array, model set in each file)
.opencode/commands/               /feature  /status  /resume  /research
.opencode/memory/<role>.md        per-agent lessons (40-line cap, committed)
specs/                            board.md, decisions.md, digest/, escalations/, <feature>/...
contract/                         shared types/schemas (architect only)
docs/design-system.md             source of truth for UI review
docs/research/                    researcher reports, INDEX.md, context.md, _template.md
.worktrees/                       gitignored: task and feature worktrees
```
Models are set literally in each agent's frontmatter. Sampling (temperature/top_p) is not set per agent in V2:
put it on the model variant (`provider/model#variant`).

## Roles, modes and step limits
| Role | Mode | Steps | Writes |
| --- | --- | --- | --- |
| delivery-manager | primary (default) | 150 | board, digest, escalations, merges |
| product-owner | all | 40 | brief, criteria, acceptance |
| architect | subagent | 90 | plan, contract, decisions |
| backend-builder / frontend-builder | subagent | 80 | code in task worktree, build report |
| qa-engineer | subagent | 70 | e2e tests (task worktree), verdicts, evidence |
| design-reviewer | subagent | 40 | verdicts (read-only otherwise) |
| code-reviewer | subagent | 50 | verdicts (read-only otherwise) |
| researcher | all | 80 | `docs/research/**` only |
Hitting a limit triggers the handoff rule in AGENTS.md section 14; `/resume` continues from the board.

## Day to day
- `/feature <intent>`: full pipeline (shape, plan, tests first, build, verify, merge, accept, digest).
- `/research <question>` (add "quick" or "deep"): structured research report. Or `@researcher` in any session.
- `/status` for the board, `/resume` after an interruption.
- You are pulled in only by AGENTS.md section 8 triggers. The dial is `human_gates` in `specs/board.md`:
  `exception-only` (default) · `plan` · `merge` · `plan+merge`. R2 work always needs you before merge.

## Research agent
- In the pipeline: product owner or architect returns `NEEDS_RESEARCH`; the delivery manager invokes the
  researcher, reads only the TL;DR, and escalates to you only if the recommendation needs an account, payment or
  recurring cost above your budget norm. Otherwise the architect records the choice in `specs/decisions.md`.
- Reports: `docs/research/YYYY-MM-DD-<slug>.md` in the `_template.md` structure, indexed in `INDEX.md` with a
  refresh-by date (pricing: 90 days) so the same question is reused rather than re-researched.
- `docs/research/context.md` is the researcher's standing brief (operator location, currency, budget norm,
  compliance, preferred stack). Keep it accurate: it changes recommendations materially.
- Prices and limits always come from live official pages fetched in that session, never from memory or skills.
- It uses the `websearch` and `webfetch` actions, both already allowed in `opencode.jsonc`.

## Skills mapping
| Skill | Allowed for |
| --- | --- |
| supabase | architect, backend-builder, code-reviewer, researcher |
| supabase-postgres-best-practices | architect, backend-builder, code-reviewer |
| modal | architect, backend-builder, code-reviewer, researcher |
| shadcn | architect, frontend-builder, design-reviewer |
| figma | frontend-builder, design-reviewer |
| migrate-radix-to-base | frontend-builder |
| web-perf | qa-engineer |
| cloudflare | researcher |
| find-skills | architect, builders, researcher |
Every other skill is denied by default; add it per agent in its `skill` rules if needed.

## Things worth verifying in your V2 build
1. Agent-level `permissions` override the global ones in `opencode.jsonc` (agents rely on `shell * deny` first,
   then specific allows). Quick test: ask `backend-builder` to run `curl example.com`; it must be refused.
2. Last matching rule wins inside an agent's array (every file relies on broad rules first).
3. MCP tools are exposed as `<server>_<tool>` (e.g. `playwright_*`) so the wildcard actions match them.
4. Subagents work from the main session's directory, so builders reach code through `.worktrees/T-xxx/...` paths
   and `git -C` / `npm --prefix`.
5. The researcher's model is a placeholder choice: set it to whatever you want doing research.

## Memory
opencode has no built-in per-agent memory, so each agent owns `.opencode/memory/<role>.md` (read at start, append
one reusable lesson at end, 40-line cap). Commit these files. Recurring verifier patterns (3+) are promoted to
proposed `AGENTS.md` rules in the digest, which only you approve.
