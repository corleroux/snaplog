# FR-MOD-01 — Single provider interface, Gemini behind it

**Branch:** `task/fr-mod-01-provider-interface` · **Priority:** P0 · **Effort:** ~8h
**Satisfies:** FR-MOD-01; completes FR-SCH-02 (fabric schema-driven, same behaviour).
**Depends on:** the FR-SCH-01 registry plan landing first.

## Files

- `supabase/functions/_shared/providers/types.ts`: `ExtractionProvider.extract({ images: {base64, mimeType}[], schema, scanType? })` → `{ json, raw, provider, model, usage: {inputTokens?, outputTokens?, costUsd?} | null, latencyMs }`. `images` is an array now (SAM/video and Muse Spark need multi-image). Optional `confidences` slot for FR-EXT-06.
- `supabase/functions/_shared/providers/geminiProvider.ts`: prompt built from the schema (fields, hints, allowed values, translation rule); reuses `_shared/geminiClient.ts`; JSON parse; schema-driven normalisation — trim/number/null, never defaults. All Gemini specifics stay inside this module.
- `supabase/functions/_shared/providers/getProvider.ts`: `EXTRACTION_PROVIDER` env, default `gemini` (fallback logic is FR-MOD-03, not this task).
- Refactor `extract-fabric-document/index.ts` first, then `extract-vendor-document/index.ts`: registry + provider replace `callGemini`, the hardcoded prompts and per-field normalisers. External request/response contracts and `raw_payload` / `normalized_payload` / metadata shapes stay byte-compatible; client code and e2e mocks untouched.
- `supabase/migrations/084_scan_sessions_run_fields.sql` (additive): `schema_type`, `schema_version`, `provider`, `model`, `latency_ms`, `usage jsonb`, `cost_usd` on `scan_sessions`; keep existing `extractor_*` columns.
- `supabase/functions/_tests/fixtures/gemini/fabric-product-tag.json` and `vendor-card.json` — recorded raw Gemini responses, committed; golden tests assert parity with today's normalised output.
- `supabase/.sb.env.example`: optional `EXTRACTION_PROVIDER=` (default gemini).

**Gemini keeps working throughout:** remote functions are never deployed unasked; each edge function is refactored one at a time behind an unchanged contract, with golden fixture tests proving output parity before landing.

## Acceptance

`pnpm test:edge` (golden fixtures + refactored functions); `pnpm test:e2e -- e2e/fabric-capture.spec.ts` and `e2e/vendor-capture.spec.ts`; `pnpm lint && pnpm check && pnpm test:run`. Observable: a local fabric scan still extracts via Gemini and its `scan_sessions` row carries `schema_type='fabric', schema_version=1, provider, model, latency_ms`.

## Risks / verify first

- Prompt parity — preserve temperature 0.1, maxOutputTokens 4096, `responseMimeType: application/json` and the exact scan-type guidance text.
- `usage` may be null; pricing lands with FR-MOD-04.
- Record fixtures once, offline; never commit keys; unit tests never call live APIs.
