# FR-MOD-02c — Health-check the active provider

**Branch:** `task/fr-mod-02c-health-check` · **Priority:** P0 (all-Meta runtime + honest health) · **Effort:** ~2h
**Satisfies:** FR-MOD-02 (the demo runtime must be all-Meta — the health-check is currently the one live caller of a non-Meta model); event rule "every model your project calls at runtime must be a Meta model."
**Depends on:** FR-MOD-02a landed (default `muse-spark`).

**Decision:** check the **active provider** resolved the same way as `getProvider`/`envValidation` (`EXTRACTION_PROVIDER`, default `muse-spark`), not a hard-coded model. One `extraction_api` check replaces `gemini_api`. Verified safe: no client code consumes the old field (grep clean); only `supabase/functions/_tests/health-check.test.ts` references it.

## Files

- `supabase/functions/health-check/index.ts`: keep the database check; replace Check 2 with a provider switch — `muse-spark`: `GET https://api.meta.ai/v1/models`, Bearer `MODEL_API_KEY` (verify this endpoint shape in implementation; adjust if it 404s); `muse-spark-open`: `GET <SPARK_OPEN_BASE_URL>/v1/models`, Bearer `MODAL_PROXY_TOKEN`; `gemini`: keep the existing models-list GET (only reachable when explicitly configured). Missing key for the active provider → `{ ok: false, error: '<KEY> not configured' }`, same as today. Response shape: `checks: { database, extraction_api: { ok, provider, latency_ms?, error? } }`; `allHealthy` unchanged in logic.
- `supabase/functions/_tests/health-check.test.ts`: rename `gemini_api` assertions to `extraction_api` (+ provider field); add a case pinning the default to `muse-spark` with no `GEMINI_API_KEY` set — the regression test for this task.
- `supabase/.sb.env.example`: note that health reflects the active provider; `GEMINI_API_KEY` no longer needed for a healthy all-Meta deploy.

## Acceptance

`supabase start` → `pnpm test:edge` (health-check suite green); with `EXTRACTION_PROVIDER` unset and no `GEMINI_API_KEY`, `GET /functions/v1/health-check` returns 200 `healthy` when DB + Meta API are reachable — previously impossible (forced 503). `pnpm lint && pnpm check`.

## Risks / verify first

- Confirm the Meta `/v1/models` endpoint shape during implementation (cheap, zero inference tokens — never send a chat completion from a health probe).
- The probe must stay lightweight: 5s timeout, no retries, no inference spend.
- Do not change auth (public endpoint) or CORS behaviour.
