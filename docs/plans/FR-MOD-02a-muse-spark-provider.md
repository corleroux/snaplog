# FR-MOD-02a — Muse Spark provider + default flip

**Branch:** `task/fr-mod-02a-muse-spark-provider` · **Priority:** P0 (demo runtime) · **Effort:** ~6h
**Satisfies:** FR-MOD-02 (Muse Spark leg); makes the demo all-Meta per the event rule "every model your project calls at runtime must be a Meta model."
**Depends on:** FR-MOD-01 landed.

**Decision:** raw-fetch provider against `https://api.meta.ai/v1/chat/completions` with `response_format: {type: "json_schema"}` built from the registry schema (verified in Meta docs; the Responses API would need `text.format` — we use Chat Completions). Default model `muse-spark-1.3`; `muse-spark-1.1` fallback (proven in the owner's own setup).

## Files

- `supabase/functions/_shared/providers/museSparkProvider.ts`: Bearer `MODEL_API_KEY`; image parts as data URLs; JSON-schema response format derived from the registry schema; prompt reuses FR-MOD-01's schema-driven builder (translation + null rules); usage/latency captured; normaliser nulls unknowns — never guess.
- `getProvider.ts`: register `muse-spark`; flip `EXTRACTION_PROVIDER` default to `muse-spark`.
- `supabase/.sb.env.example`: `MODEL_API_KEY=`, `MUSE_SPARK_MODEL=` (documents `muse-spark-1.3` Standard; `muse-spark-1.3-contributor` for cheap dev).
- Fixtures `supabase/functions/_tests/fixtures/muse-spark/*.json` + parity tests against the Gemini golden shape (identical normalised payload).

## Mode rule (owner directive + privacy)

Dev iterations on **non-PII images** (garments, swatches) may use contributor mode (≈12× cheaper). **Vendor-card PII, the benchmark, and the demo: Standard `muse-spark-1.3` only** — contributor mode sends prompts to Meta training. Cost note: Standard-mode dev usage is ≈$3–5 total; the $150 credit is ample either way.

## Acceptance

Fixture tests + `pnpm test:edge`; e2e fabric/vendor specs green (mocked); one supervised live probe (≤5 calls, owner's explicit go) extracts a real garment photo via `muse-spark-1.3` with schema-valid JSON; `scan_sessions` rows carry `provider='muse-spark'`.

## Risks / verify first

Structured-output and image data-URL behaviour confirmed in the probe; recursive schemas are rejected by Meta (ours is fixed-depth — confirm); 3,000 RPM / 4M TPM limits are a non-issue.
