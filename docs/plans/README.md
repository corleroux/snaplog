# Plans — Handover to the Build Team

**From:** architect · **Date:** Fri Oct 30, 2026 · **Status:** planning complete, build starting now.

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
- **Credits:** Meta $150 available. Modal $100 pending — drop-deads: Sun Nov 1 EOD (plan Spark Open into the benchmark), Mon Nov 2 EOD (any live run).
- **Migration numbering:** parallel branches are running — always check the latest migration number at branch time; the numbers in plans are indicative.

## Execution order

| Wave | Task | Plan file | Effort | Depends on |
|---|---|---|---|---|
| 1 (Fri) | ① Submission repo + baseline sync | `SUB-01-submission-repo.md` | 4h | — |
| 1 (Fri) | ② Schema registry | `FR-SCH-01-schema-registry.md` | 4h | — |
| 1 (Fri) | ③ Eval-set export/labeling starts | `FR-MOD-04-eval-set.md` | 5h | owner shoot Sat |
| 2 (Sat) | ④ Provider interface + Gemini parity | `FR-MOD-01-provider-interface.md` | 8h | FR-SCH-01 |
| 3 (Sat night/Sun) | ⑤ Muse Spark provider + default flip | `FR-MOD-02a-muse-spark-provider.md` | 6h | FR-MOD-01 |
| 3 (Sun) | ⑥ Garment schema + item storage | `FR-SCH-03-garment-schema.md` | 8h | FR-SCH-01 |
| 4 (Sun/Mon) | ⑦ Muse Spark Open on Modal | `FR-MOD-02b-spark-open-modal.md` | 4h | FR-MOD-01, Modal token |
| 4 (Mon) | ⑧ Video pipeline (critical path) | `FR-VID-video-pipeline.md` | 12h | FR-MOD-02a, FR-SCH-03 |
| 5 (Mon/Tue) | ⑨ Schema-driven review UI | `FR-SCH-05-EXT-06-schema-review-ui.md` | 8h | FR-SCH-03 |
| 5 (Mon/Tue) | ⑩ Benchmark runner | `FR-MOD-04-benchmark-runner.md` | 6h | FR-MOD-02a, eval set |
| 6 (Tue/Wed) | ⑪ Demo video + write-up + submit | `SUB-02-demo-writeup-submission.md` | 4h + recording | everything |

Waves 1 and 3+ run as parallel tracks (builder ∥ inference agent). **Critical path: FR-MOD-01 → FR-MOD-02a → FR-VID → benchmark → submit.** Reviewer (read-only P0 pass) before submission; design-reviewer after ⑨.

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

## When in doubt

Ask the architect — never redesign a plan unilaterally. If a plan conflicts with reality on the ground, stop and escalate rather than improvise.
