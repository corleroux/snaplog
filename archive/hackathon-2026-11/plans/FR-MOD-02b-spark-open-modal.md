# FR-MOD-02b — Muse Spark Open on Modal

**Branch:** `task/fr-mod-02b-spark-open-modal` · **Priority:** P0 (open-weights leg) · **Effort:** ~4h
**Satisfies:** FR-MOD-02 (open-weights leg); qualifies for the $10K "Best Build on Meta Open Weight Models" bonus (partner-provided inference counts).
**Depends on:** FR-MOD-01; a Modal proxy token from the owner (credits pending — build the code regardless; run only when the token exists and the owner asks).

**Decision:** call Modal's **Shared Endpoint** for Muse Spark Open (verified: live since Oct 15, per-token billing at $1.25/$4.25 per Mtok, OpenAI-compatible at `https://inference.us-west.modal.direct`, proxy-token auth, structured output supported). No GPU hosting and no `modal deploy` — the endpoint is Modal-managed; our code is only a client. Baseten's `meta-models/muse-spark-open-1026` is the fallback if Modal credits stall.

## Files

- `supabase/functions/_shared/providers/sparkOpenProvider.ts`: baseURL `https://inference.us-west.modal.direct/v1`, Bearer `MODAL_PROXY_TOKEN` (`wk-<id>.ws-<secret>`), model `meta-models/Muse-Spark-Open-816B-A42B` (confirm exact ID via a `GET /v1/models` probe), `response_format: json_schema` — fall back to prompted-JSON + the shared normaliser if the endpoint rejects it.
- Register `muse-spark-open` in `getProvider.ts` (not the default).
- `supabase/.sb.env.example`: `MODAL_PROXY_TOKEN=`, `SPARK_OPEN_MODEL=`.
- README/write-up attribution: **"Built with Muse Spark Open"** (license requirement) — feeds SUB-01/SUB-02.
- Fixture tests with a recorded endpoint response.

## Acceptance

Fixture tests + `pnpm test:edge`; one supervised live probe (owner's explicit go, token present): garment photo → schema-valid JSON; `scan_sessions` carries `provider='muse-spark-open'`.

## Risks / verify first

Exact model ID on the shared endpoint (`/v1/models`); structured-output support on this endpoint — sources disagree (litellm says no, models.dev says yes for Modal); the probe decides, and the prompted-JSON fallback covers it. Drop-dead: credits by Mon Nov 2 EOD, else the benchmark publishes without a live open-weights leg.
