-- Migration 087: Benchmark runs (FR-MOD-04)
-- Stores published benchmark results: one row per eval capture × provider.
-- Writes are server-side only (benchmark runner uses the service role);
-- no client insert/update policies. Reads are admin-only.
-- STAGING ONLY: deploy with supabase db push --project-ref <project-ref>

CREATE TABLE IF NOT EXISTS public.benchmark_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    eval_set        TEXT NOT NULL,
    capture_id      TEXT NOT NULL,
    capture_class   TEXT NOT NULL,

    provider        TEXT NOT NULL,
    model           TEXT NOT NULL,
    mode            TEXT NOT NULL DEFAULT 'standard'
                        CHECK (mode = 'standard'),

    field_scores    JSONB NOT NULL DEFAULT '{}'::jsonb,
    accuracy        NUMERIC,
    fields_scored   INTEGER NOT NULL DEFAULT 0,
    fields_matched  INTEGER NOT NULL DEFAULT 0,
    latency_ms      INTEGER,
    input_tokens    INTEGER,
    output_tokens   INTEGER,
    cost_usd        NUMERIC,

    failure_tags    TEXT[] NOT NULL DEFAULT '{}',
    notes           TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_benchmark_runs_eval_set ON public.benchmark_runs(eval_set);
CREATE INDEX IF NOT EXISTS idx_benchmark_runs_provider ON public.benchmark_runs(provider);
CREATE INDEX IF NOT EXISTS idx_benchmark_runs_capture ON public.benchmark_runs(eval_set, capture_id);

ALTER TABLE public.benchmark_runs ENABLE ROW LEVEL SECURITY;

-- Admin/superadmin read; no client writes (service role only).
CREATE POLICY "Admins can read benchmark runs"
    ON public.benchmark_runs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );
