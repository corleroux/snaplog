# opencode team (8 roles)

Product owner, architect, delivery manager, backend builder, frontend builder, QA (Playwright), design reviewer,
code reviewer. Gates rest on evidence rather than on you approving everything; you are pulled in by exception.

## Install (project-level first, global later)
1. Copy this folder's contents into your repo root (merge `opencode.json` if you already have one).
2. Append `gitignore.snippet` to `.gitignore`.
3. `cp models.env.example models.env`, fill in model IDs (`opencode models` lists them), then run
   `scripts/render-agents.sh`. This renders `agents-src/*.md` into `.opencode/agents/` with your models.
   Re-run it whenever you change a model or edit an agent in `agents-src/`.
4. Edit the **Stack** section of `AGENTS.md`, create `docs/design-system.md`, and make sure `package.json` has
   `typecheck`, `lint`, `test`, `test:e2e`, `build` scripts and Playwright has a `webServer` configured.
5. Create `specs/board.md` (the delivery manager does this on first run) and `specs/decisions.md`.
6. Run `opencode agent list` to confirm all eight load, then `/feature <what you want>`.

## Model tiers (set in models.env)
| Variable | Used by | Guidance |
| --- | --- | --- |
| MODEL_ARCHITECT | architect | Frontier-class, NOT Kimi K3. Cheaper model with room for ~90 steps. |
| MODEL_REVIEWER | code-reviewer | Different model family from MODEL_BUILDER. |
| MODEL_BUILDER | both builders | Solid mid-tier coder. |
| MODEL_QA / MODEL_DESIGN | qa, design | Vision-capable. |
| MODEL_ORCHESTRATOR | delivery-manager | Cheap, reliable tool-caller. |
| MODEL_PRODUCT | product-owner | Strong writer/reasoner, modest steps. |

## Step limits
product-owner 40 · architect 90 · delivery-manager 150 · backend/frontend builder 80 · qa 70 · design 40 · code review 50.
Hitting a limit triggers the handoff rule in AGENTS.md section 14; `/resume` continues from the board.

## The autonomy dial
`human_gates` in `specs/board.md`: `exception-only` (default) · `plan` · `merge` · `plan+merge`. R2 work always
needs a human before merge. Permission `ask` prompts (spend/deploy: `modal run|deploy`) always reach you.

## Skills mapping
| Skill | Allowed for |
| --- | --- |
| supabase | architect, backend-builder, code-reviewer |
| supabase-postgres-best-practices | architect, backend-builder, code-reviewer |
| modal | architect, backend-builder, code-reviewer |
| shadcn | architect, frontend-builder, design-reviewer |
| figma | frontend-builder, design-reviewer |
| migrate-radix-to-base | frontend-builder |
| web-perf | qa-engineer |
| find-skills | architect, builders |
Every other skill (Cloudflare set, video/hyperframes set, composio, report, opencode) is denied by default.
Add it per agent in the `skill:` block if a future task needs it.

## Things to verify against your opencode v2 build
I wrote these against the documented agent frontmatter (`mode`, `model`, `temperature`, `steps`, `hidden`,
`permission` with pattern maps, `task` allow-list, `skill` patterns). Check:
1. `steps` (older builds: `maxSteps`) and the `permission` key names load without warnings.
2. Rule precedence in pattern maps is "last matching rule wins" (the files rely on `"*": deny` coming first).
3. Agents are read from `.opencode/agents/` (older builds: `.opencode/agent/`).
4. MCP tools are exposed as `playwright_*` so the permission wildcard matches them.
5. Subagents inherit the main session's working directory, so builders reach code through `.worktrees/T-xxx/...`
   paths and `git -C` / `npm --prefix`. If your build supports a per-agent working directory, simplify.

## Memory
opencode has no built-in per-agent memory, so each agent owns `.opencode/memory/<role>.md` (read at start, append
one reusable lesson at end, 40-line cap). Commit these files. Recurring verifier patterns get promoted to proposed
`AGENTS.md` rules in the digest, which only you approve.
