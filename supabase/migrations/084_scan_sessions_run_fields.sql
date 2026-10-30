-- Migration 084: scan_sessions extraction-run fields (FR-MOD-01)
--
-- Every extraction run now records which catalogue schema produced it and
-- which provider/model ran it, with latency, token usage and estimated cost
-- ("Record provider, model, schema version, raw output, latency and cost for
-- every extraction run"). Existing extractor_* columns are kept — this
-- migration is purely additive.
--
-- Filled by extract-fabric-document / extract-vendor-document via
-- _shared/scanSession.ts (markExtractionSucceeded + buildExtractionRunInfo).
-- cost_usd stays null until provider pricing lands (FR-MOD-04).
--
-- STAGING ONLY: deploy with supabase db push --project-ref <project-ref>

ALTER TABLE public.scan_sessions
    ADD COLUMN IF NOT EXISTS schema_type TEXT,
    ADD COLUMN IF NOT EXISTS schema_version INTEGER,
    ADD COLUMN IF NOT EXISTS provider TEXT,
    ADD COLUMN IF NOT EXISTS model TEXT,
    ADD COLUMN IF NOT EXISTS latency_ms INTEGER,
    ADD COLUMN IF NOT EXISTS usage JSONB,
    ADD COLUMN IF NOT EXISTS cost_usd DOUBLE PRECISION;
