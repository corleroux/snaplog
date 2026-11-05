# FR-MOD-04 — Benchmark runner

**Branch:** `task/fr-mod-04-benchmark-runner` · **Priority:** P0 · **Effort:** ~6h
**Satisfies:** FR-MOD-04 (same captures across providers; field-level accuracy, latency, cost recorded); FR-MOD-05 via the published results doc.
**Depends on:** FR-MOD-02a; the eval set (see FR-MOD-04-eval-set); FR-MOD-02b if live.

**Decision:** a local deno runner that imports the real `_shared/providers/*` + registry — one extraction implementation, no reimplementation — rather than a Modal batch job: no GPU, no extra credits, same code path. Providers compared: `muse-spark` (Standard), `muse-spark-open` (if the token is live), and `gemini` labelled **legacy baseline** (event rule: all-Meta runtime — Gemini appears as pre-existing context, not a scored demo provider).

## Files

- `scripts/run-benchmark.ts` (deno, like `scripts/smoke-test.ts`): reads `eval/manifest.json`; per capture × provider: extract → score field-level accuracy against ground truth (normalised string/number match; null-vs-value counted); record latency and cost = usage × a **hard-coded Standard price table** (Muse Spark $1.25 in / $4.25 out per Mtok).
- Hard rule in code: **asserts Standard-mode model IDs** regardless of the dev environment — contributor mode can never contaminate published numbers (PII + pricing integrity).
- Migration (next number, verify at branch time): `benchmark_runs` table (eval set, provider, model, mode, scores jsonb, mean latency, cost, timestamps) + RLS owner-read.
- Output: `docs/benchmark-results.md` (per-field accuracy, failure patterns, cost per item) + rows in `benchmark_runs`.

## Acceptance

Dry run on three fixture captures with recorded provider fixtures (no network) produces scored rows; `pnpm lint && pnpm check`. Live run over the full eval set only on the owner's explicit ask (planned Tue Nov 3), recorded in `benchmark_runs`.

## Risks / verify first

Eval manifest must be complete (garment entries need FR-SCH-03 landed first); translation quality is spot-checked manually per PRD §8.4 and noted in the results; the runner stays out of CI — it never runs live in tests.
