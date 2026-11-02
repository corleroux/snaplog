# Plans — Handover to the Build Team

**From:** architect · **Date:** Fri Oct 30, 2026 · **Status:** planning complete, build starting now.

## ⓪ FIRST PRIORITY — agent config alignment (action before any other work)

`.opencode/agents/*.md` are stale relative to hackathon decisions. The build team owns these edits (architect is not permitted to touch them). Do not start Wave 1 until P0 items are applied.

**P0 — wrong if left (will cause real damage):**

1. **`builder.md` line 30: wrong branch base.** Says `task/*` branch "off `main`". AGENTS.md workflow is branch from **`staging`**, never push to `main`. Fix to `staging` or the first PR targets the wrong branch.
2. **`inference.md` permissions + contract point at a directory that doesn't exist.** Edit-allow is `supabase/functions/_shared/ai/**` and the contract (line 31) says provider modules live there — they live in `supabase/functions/_shared/providers/`. As written, `inference` cannot edit its own code. Change `ai/**` → `providers/**`, and add allows for the shared model-layer modules it owns: `supabase/functions/_shared/catalogueSchemaRegistry.ts`, `supabase/functions/_shared/extractionPrompt.ts`, `supabase/functions/_shared/extractionNormaliser.ts`, plus `scripts/run-benchmark.ts` and `scripts/validate-eval-manifest.ts` (benchmark/eval runner scripts per their plans).

**P0 — stale facts that will misdirect the build:**

3. **`inference.md` line 34 (providers) is pre-decision.** Replace with: "Gemini (legacy baseline — code, fixtures, write-up only; never called at runtime), Muse Spark via Meta Model API (default since FR-MOD-02a), Muse Spark Open via Modal's *Shared Endpoint* (per-token, proxy-token auth; never self-hosted — Glimmer is out, Spark Open is in)."
4. **`inference.md` line 35 (video) is pre-decision.** Replace with: "Modal orchestrates; SAM 3.1 is called via the Meta Model API (never self-hosted); per-item extraction stays in the TS edge layer; Modal never re-implements extraction."
5. **`inference.md` line 42 (benchmark location) is wrong.** Runner lives in `scripts/run-benchmark.ts` (deno), manifest/fixtures in `eval/` — not "the benchmark runner in `eval/`".

**P1 — gaps to close in the same pass:**

6. **`builder.md` line 28:** reading list must add `docs/plans/README.md` (this file) — currently AGENTS.md + PRD + plans only.
7. **`builder.md` process:** add a step — "After each merge to staging, run `./scripts/build-submission.sh` and push `snaplog-meta-hackathon` (SUB-01)." Currently the sync lives only in this handover and will be forgotten.
8. **`reviewer.md` line 40:** must also read the task's plan in `docs/plans/` (currently PRD + AGENTS.md only). Add two checks: **(a)** all-Meta runtime — no live calls to non-Meta models, `GEMINI_API_KEY` must not become required for the default path; **(b)** event-work separability — the change must be expressible as patch/new-files for the submission repo, no baseline rewrites.
9. **`tester.md` cannot run what it claims.** Shell allows only `pnpm test:e2e*` (ask) but the role covers unit/edge tests — add `pnpm test:run*`, `pnpm test:edge*`, `pnpm test:rls*`. Edit-rules miss the actual fixture locations: add `supabase/functions/_tests/fixtures/**` (JSON golden fixtures — `**/*.test.ts` doesn't match `.json`) and `modal/test_*.py` (SAM parser tests).
10. **`inference.md`:** add the Standard/contributor mode rule (Standard `muse-spark-1.3` for PII/benchmark/demo; contributor only for non-PII dev) and "read the task's plan file first" (currently AGENTS.md + PRD only).

**P2 — polish, same pass if time:**

11. **`architect.md` line 34:** reading list must add `Event Details.md` and `docs/plans/README.md`; "ten-day build" is stale (deadline Wed Nov 4 9PM ET — plan against remaining runway).
12. **`design-reviewer.md`:** add two hackathon checks — video/pipeline entry must show a clear disabled/unavailable state when unconfigured (lean-Modal reality); the fabric/garment switch must be obvious on camera (demo legibility).
13. **All six files pin `meta/muse-spark-1.3-contributor`.** Keep it (owner's cost decision), but note the implication: contributor mode may send prompts to Meta training — redact real vendor-card PII from pasted payloads in agent sessions where possible. Owner to confirm standing rule.
14. **Wire builder → architect (P0 — without this the "ask the architect" rule has no mechanism).** `builder.md` denies all subagents except the five listed, so the escalation path in "When in doubt" currently dead-ends. Two changes, verified against the OpenCode V2 agents doc: **(a)** `architect.md`: `mode: primary` → `mode: all` (`all` = runs as primary *and* as subagent; primary availability is preserved); **(b)** `builder.md` permissions: add `{ action: subagent, resource: "architect", effect: allow }`. As a subagent the architect keeps its own permissions (plan-writing under `docs/plans/`, read-only elsewhere, `explore` available) — so the builder can invoke it mid-execution to revise a plan when reality diverges, instead of improvising. Scope of use: plan revisions and trade-off decisions only; the architect still never writes code.

## ⓪b FIRST PRIORITY — required-reading alignment (same pass as ⓪, before Wave 1)

Required reading per the agent files is `AGENTS.md`, `docs/PRD.md`, `DESIGN_SYSTEM.md` (+ `Event Details.md` and this handover, newly added). Scanned all of them against the repo. `docs/PRD.md` stays frozen as the requirement source — deviations (SAM-via-API etc.) correctly live in plans, no PRD rewrite mid-hackathon. Two P0s, two P1s, one P2 against `AGENTS.md` itself:

**P0 — broken or dangerous if left:**

A. **`DESIGN_SYSTEM.md` does not exist — but do NOT build the full file yet.** `AGENTS.md` line 28 and `design-reviewer` both depend on it (verified by repo-wide glob), so: create a **stub only** (~15 min micro-task, ahead of ⑨): stack facts (shadcn/ui new-york per `components.json`, Tailwind per `tailwind.config.js` + `src/styles/globals.css`, `@/components/ui` primitives incl. `LoadingState`/`EmptyState`/`ErrorState`/`ConfidenceBadge`/`bottom-action-bar`), one line that the full system arrives via the OpenDesign session (task ⑨a), and a pointer to this handover. The approved OpenDesign output then *becomes* `DESIGN_SYSTEM.md`. Reason for stub-not-full: the owner is running an OpenDesign redesign imminently — a full hand-written file now would be throwaway work.

B. **The event's hardest rule is nowhere in `AGENTS.md`.** "Every model called at runtime must be a Meta model" lives only in `Event Details.md` + this handover — and line 17 still lists Gemini first with no qualification, so any agent reading only `AGENTS.md` can reasonably ship a Gemini-runtime path. Add to Architecture rules: "All-Meta runtime (event rule): default extraction provider is `muse-spark`; Gemini is baseline-only (fixtures/write-up) and is never called live — no `GEMINI_API_KEY` requirement on the default path."

**P1 — fix in the same pass:**

C. **"Done" (line 62) omits the submission sync.** Add "and the submission repo is synced via `build-submission.sh` + push" — otherwise tasks read done while the public repo rots.
D. **Line 17/20 will misdirect `inference`.** Clarify line 17: "open-weights = Muse Spark Open via Modal *Shared Endpoint* (never self-hosted)"; line 20: "SAM 3.1 via Meta Model API — Modal orchestrates, never hosts the model."

**P2 — cosmetic, same pass if time:**

E. "Ten-day build" (line 5) is stale — deadline is Wed Nov 4 9PM ET. Line 34 benchmark line: add Standard-mode-only + never-Gemini-live (currently only in plans).

## Read these first, in order

1. `AGENTS.md` (repo root) — architecture rules, conventions, checks, safety.
2. This file — execution order and decisions.
3. `docs/PRD.md` — requirements. Every plan traces to an FR or a PRD section.
4. `Event Details.md` (repo root) — hackathon rules, judging rubric, submission format.
5. `docs/hackathon-status-update.md` — decisions log with owner feedback.

## Hard facts

- **Deadline:** submit Wed **Nov 4, 9:00 PM ET** (04:00 SAST Thu Nov 5). Tue Nov 3 is the last troubleshooting day. Record the demo video Tue.
- **Track:** Startup. **Theme:** "Build for Your World."
- **Repos:** day-to-day work happens in **`snaplog`** (this repo). `corleroux/snaplog-meta-hackathon` is the public, curated submission repo — populated only by SUB-01's `build-submission.sh` after each task merge. The `hackathon-baseline` tag on `42570b3` marks the pre-existing code; everything after it is event work.
- **All-Meta runtime:** every model the demo calls at runtime must be Meta (event rule). Gemini is legacy baseline only — code, fixtures, write-up; never demo runtime. Default provider becomes `muse-spark` in FR-MOD-02a.
- **Contributor-mode guardrail:** `muse-spark-*-contributor` is fine for dev on non-PII images (garments, swatches, fixtures). Vendor-card PII, the benchmark, and the demo run **Standard mode only**. The benchmark runner hard-pins Standard in code.
- **Credits:** Meta $150 available. Modal event tokens never arrived — operating **lean on ~$1 Modal credit**: no benchmark-scale Modal spend; one video deploy + 1–2 rack-walk runs + a handful of Spark Open extractions only, then freeze. If $30 lands Mon afternoon it funds benchmark write-up numbers, never the video critical path (video must already be recorded by then).
- **Design quarantine:** all design work lives on `task/design-rework` ONLY — brand assets, tokens, screens, exports. **Never merge to `staging` until the owner explicitly signs off** (owner replies "merge design-rework"; builder merges via PR). No partial merges, no exceptions.
- **Migration numbering:** parallel branches are running — always check the latest migration number at branch time; the numbers in plans are indicative.

## Execution order

| Wave | Task | Plan file | Effort | Depends on |
|---|---|---|---|---|
| 1 (Fri) | ① Submission repo + baseline sync | `SUB-01-submission-repo.md` | 4h | — |
| 1 (Fri) | ①b Submission narrative fix (direct edit, no branch) | `SUB-01b-submission-narrative.md` | 30 min | — |
| 1 (Fri) | ② Schema registry | `FR-SCH-01-schema-registry.md` | 4h | — |
| 1 (Fri) | ③ Eval-set export/labeling starts | `FR-MOD-04-eval-set.md` | 5h | owner shoot Sat |
| 2 (Sat) | ④ Provider interface + Gemini parity | `FR-MOD-01-provider-interface.md` | 8h | FR-SCH-01 |
| 3 (Sat night/Sun) | ⑤ Muse Spark provider + default flip | `FR-MOD-02a-muse-spark-provider.md` | 6h | FR-MOD-01 |
| 3 (Sat night/Sun) | ⑤b Health-check the active provider | `FR-MOD-02c-health-check.md` | 2h | FR-MOD-02a |
| 3 (Sun) | ⑥ Garment schema + item storage | `FR-SCH-03-garment-schema.md` | 8h | FR-SCH-01 |
| 4 (Sun/Mon) | ⑦ Muse Spark Open on Modal | `FR-MOD-02b-spark-open-modal.md` | 4h | FR-MOD-01, Modal token |
| 4 (Mon) | ⑧ Video pipeline (critical path) | `FR-VID-video-pipeline.md` | 12h | FR-MOD-02a, FR-SCH-03 |
| 2–4 (window) | ⑨a OpenDesign prompt pack + output review (feeds ⑨) | `DESIGN-01-opendesign-brief.md` *(architect-authored; naming exception — brief, not FR plan)* | brief done; session (owner) + review 1h | ⓪/⓪b (stub); feeds ⑨ |
| 5 (Mon/Tue) | ⑨ Schema-driven review UI | `FR-SCH-05-EXT-06-schema-review-ui.md` | 8h | FR-SCH-03 |
| 4–5 (Mon) | D-A Brand asset integration | `DESIGN-02A-brand-assets.md` | 1h | Stream A PASS (have it) |
| 4–5 (Mon) | D-B Social exports + sting recording | `DESIGN-02B-social-sting.md` | 1–2h | Stream B PASS; must exist by Mon EOD |
| 4–5 (Mon) | D-C1 Tokens reskin (fallback UI) | `DESIGN-02C1-tokens-reskin.md` | 1–2h | DES-02A; DONE before Tue 12:00 |
| 5 (Tue, gated) | D-C2 Stream C screens port (visual-only) | `DESIGN-02C2-screens-port.md` | 10–12h | D-C1 DONE; Tue 12:00 gate decides |
| 4 (Mon EOD) | M-J Modal endpoint check (owner) | `FR-VID-modal-jobs-check.md` | 30 min | — ; decides Jobs live vs unconfigured |
| 5 (Mon/Tue) | ⑩ Benchmark runner | `FR-MOD-04-benchmark-runner.md` | 6h | FR-MOD-02a, eval set |
| 6 (Tue/Wed) | ⑪ Demo video + write-up + submit | `SUB-02-demo-writeup-submission.md` | 4h + recording | everything |

Waves 1 and 3+ run as parallel tracks (builder ∥ inference agent). **Critical path: FR-MOD-01 → FR-MOD-02a → FR-VID → benchmark → submit.** Reviewer (read-only P0 pass) before submission; design-reviewer after ⑨.

## Task notes (read before starting the task)

- **⑤b (FR-MOD-02c) sequencing is strict: it must land AFTER ⑤ (FR-MOD-02a).** The health-check resolves the active provider the same way `getProvider` does — before the 02a default flip it would check the wrong provider. Do not parallelise these two.
- **⑤b needs no frontend work.** The old `gemini_api` health field has no client consumers (verified by grep — only `supabase/functions/_tests/health-check.test.ts` references it), so renaming it to `extraction_api` is a backend + edge-test change only.
- **Narrative consistency is a graded artifact.** The migration sentence — *"extraction used to run on Gemini; this week we moved it behind a provider interface onto Muse Spark"* — must appear verbatim in the submission README (SUB-01b), the demo-video opener (SUB-02), and the write-up (SUB-02). Before = fabric catalogue on Gemini at `hackathon-baseline`; this week = registry, provider interface, garment-as-config, video, benchmark. Never imply Gemini runs in the demo.
- **OpenDesign RACI (task ⑨a): the architect writes the prompt pack, the owner runs the session, `design-reviewer` vets the output, the builder implements it in ⑨.** Prompts are planning artifacts, and only the architect holds the full constraint set (rubric weights, demo story, scope guard, stack limits) — hence architect-authorship. The pack is tool-agnostic structured input (no OpenDesign format verified yet — owner confirms what the session expects: URL, screenshots, text brief, or a mix; architect reshapes on a 5-min turn): buyer context (trade-fair, one-handed, noisy/crowded), hard stack constraints (React + Vite + Tailwind + shadcn new-york + Capacitor — output must be implementable in these, no native-only patterns), screens (capture, schema-driven review with confidence flags, catalogue list/search, video-job progress, fabric/garment switch), demo-legibility (readable on camera at 720p inside a 3-minute video), and out-of-scope (accounts, billing, ordering — scope guard applies to design too). `design-reviewer` approves the output against constraints + mobile/demo-legibility *before* ⑨ builds it; the approved output is adopted as `DESIGN_SYSTEM.md` (closing ⓪b-A).
- **Design implementation is VISUAL-ONLY — functionality is frozen.** Every handler, route, validation rule, and conditional UI element that exists today must survive the port behaviour-identical; where prototype and code disagree, code wins. Canonical example: the capture-page thumbnail overlay (info-image vs normal upload) is absent from the prototype and non-negotiable in the port — DES-02C2 mandates an interaction inventory before any screen is touched. The review screen's functional core (schema binding + `schemaVersion` stamping) rides with ⑨, never with the design branch; prototype `SCHEMAS` literals must be deleted, never shipped.
- **Tue 12:00 fallback trigger (owner decision, no debate):** if Stream C is not substantially complete by Tue 12:00, the submission UI is tokens-reskin + current layout, full stop. DES-02C1 must therefore be DONE (not started) before the trigger. Partial Stream C work stays on the unmerged design branch.

## Non-negotiables (from AGENTS.md — enforced)

- Branch `task/<fr-id>-slug` from `staging`, integrate by PR. Only the builder commits.
- Before finishing any task: `pnpm lint`, `pnpm check`, `pnpm test:run`; `pnpm build` when types/routing changed. Edge tests need `supabase start`.
- Migrations are local until explicitly asked — never push to the shared Supabase project. Same for function deploys.
- No `modal deploy`, GPU jobs, or live benchmark runs without the owner's explicit ask. Unit tests never call live model APIs.
- Provider SDKs/fetch code only inside `supabase/functions/_shared/providers/`. No model keys in the client.
- After every merge: run `build-submission.sh` and push to `snaplog-meta-hackathon`.
- Never guess: low-confidence/missing fields stay flagged, not filled. Never overwrite `reviewed_payload`.
- Video is async: edge hands off to Modal and returns; per-item extraction stays in the TS edge layer.

## Already met — do not rebuild

FR-EXT-01/02/03/04/05, FR-CAT-01 (fabric), FR-SCH-02 (completes with FR-MOD-01), FR-SCH-04 (rides along FR-MOD-01 + FR-SCH-03), FR-VID-04 (free via SAM identities).

## Cut — do not build

FR-CAT-03, FR-CAT-04, FR-MOD-03, FR-CAT-02, FR-MOD-05 in-app view (the write-up satisfies it). Two categories only — no scope creep.

## Owner checkpoints during execution

- Supervised live probe go (≤5 Muse Spark calls, Wave 3).
- Modal proxy token + credit status (by Sun EOD / Mon EOD).
- Secrets audit decision before making `snaplog` public.
- Explicit asks: benchmark live run (Tue), video pipeline live test.
- Garment shoot + rack-walk video (Saturday) — feeds eval set and demo.
- **Mon EOD — Modal endpoint check (YOU, owner):** post one line, "Jobs: LIVE" or "Jobs: UNCONFIGURED" (`FR-VID-modal-jobs-check.md` — 30 min, you hold the account/secrets). Silence defaults to UNCONFIGURED on Tue 09:00. This decides whether Jobs polls live or ships the disabled state — the builder cannot resolve it without you.
- **Tue 12:00 — fallback trigger (YOU, owner):** Stream C substantially complete? If no, tokens-reskin + current layout ships, no debate. Decide on the hour, not at midnight.
- **Architect framing review:** builder pings architect with the write-up draft before recording (SUB-02) — architect checks the migration narrative against the SUB-01b standard. 5 min, blocks recording, not the draft itself.

## When in doubt

Ask the architect — never redesign a plan unilaterally. If a plan conflicts with reality on the ground, stop and escalate rather than improvise.

## Status update — Mon Nov 2 (builder)

Impromptu owner-directed work, all merged to `staging` with reviewer/design-reviewer/tester passes and submission syncs:

- **Nested-button hydration fix** (no FR; markup bug): `StyleCard` outer `<button>` → `<article>` (shortlist heart stays the sole inner `<button>`). Killed the `installHook.js` "button cannot be a descendant of button" warning on the style list.
- **PR #30 — FR-CAT-01 unified styles screen** (plan `FR-CAT-01-unified-styles.md`, architect-revised via builder escalation; supersedes 05b §2 one-lane split): styles list merges `fabric_styles` + mapped `catalogue_items` (`ci-` ids, shortlist/detail guarded, REVIEW / `Garment · AI` / `Video · AI` badges, neutral empty copy); commit landing moved to the styles list; vendor-page `CatalogueItemsSection` removed. Live-verified: a real garment capture for vendor `aa46a6d5…` renders on the styles screen. Submission patch `0019`.
- **PR #31 — FR-CAT-01 item detail page** (plan `FR-CAT-01-item-detail.md`): route `…/vendors/:vendorId/items/:itemId`, read-only + canEdit-gated archive (no edit UI, no shortlist/approval/comments/inventory/pricing/QR per scope guard). Tapping a garment opens its detail (hero, schema fields, variants, warnings). Submission patch `0020`.
- FR-CAT-01 is now met for non-fabric display + detail (fabric leg was already met). Test suite: 859 passed / 0 failed.
- Deliberately skipped: list→detail e2e (needs data writes on the shared remote project — safety rules); suggested follow-up is a mocked-boundary spec.
- **DESIGN-02 audit (Mon Nov 2):** 02A/02B/C1 rewritten vs staging; C2 split into `DESIGN-02C2` (master gate) + `DESIGN-02C2a/b/c`. Marked DONE there: G1 guard, review functional core, B3 vendor actions (all real). Still NOT DONE: 02A assets integration, 02B exports (due Mon EOD), C1 tokens, C2 port. Conflicts resolved in C1/C2c: review font rule wins over DESIGN-HANDOFF:22; `@theme` block (redesign :98-109) is normative over "extend" (HANDOFF:44 stale, fix rides C1); no Jobs screen exists — video port styles `VideoCaptureScreen` only, unconfigured state needs the owner's Mon-EOD "Jobs: LIVE/UNCONFIGURED" decision, never invented UI.

Still open from the checkpoint list: Mon EOD Modal endpoint check (owner), benchmark/video live-test asks, Tue 12:00 design fallback trigger, write-up framing review before recording.
