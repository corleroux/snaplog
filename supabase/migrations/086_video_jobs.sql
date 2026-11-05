-- Migration 086: Video pipeline support (FR-VID)
-- Adds a video scan_type plus the video_jobs table tracking async Modal jobs.
-- STAGING ONLY: deploy with supabase db push --project-ref <project-ref>

-- ============================================================
-- scan_sessions: allow video scans (additive intent — old values stay valid)
-- ============================================================
ALTER TABLE public.scan_sessions
    DROP CONSTRAINT IF EXISTS scan_sessions_scan_type_check;

ALTER TABLE public.scan_sessions
    ADD CONSTRAINT scan_sessions_scan_type_check
    CHECK (
        scan_type IN (
            'vendor_card', 'vendor_signage', 'vendor_brochure', 'vendor_catalog',
            'product_tag', 'stock_sheet', 'fabric_card', 'multi_variant_sheet',
            'garment_flat', 'garment_hanging', 'garment_worn', 'garment_label',
            'rack_video'
        )
    );

-- ============================================================
-- TABLE: video_jobs
-- One row per async video processing job handed to Modal.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.video_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_session_id UUID NOT NULL REFERENCES public.scan_sessions(id) ON DELETE CASCADE,
    event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    vendor_id       UUID REFERENCES public.vendors(id) ON DELETE SET NULL,

    status          TEXT NOT NULL DEFAULT 'queued'
                        CHECK (status IN ('queued', 'processing', 'complete', 'failed')),
    progress        NUMERIC NOT NULL DEFAULT 0,
    items_found     INTEGER NOT NULL DEFAULT 0,
    error           TEXT,

    created_by      UUID NOT NULL REFERENCES public.profiles(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_jobs_scan_session_id ON public.video_jobs(scan_session_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_event_id ON public.video_jobs(event_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON public.video_jobs(status);

DROP TRIGGER IF EXISTS trg_video_jobs_updated_at ON public.video_jobs;
CREATE TRIGGER trg_video_jobs_updated_at
    BEFORE UPDATE ON public.video_jobs
    FOR EACH ROW
    EXECUTE PROCEDURE public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (mirrors scan_sessions: event-scoped members)
-- ============================================================
ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can select video_jobs"
    ON public.video_jobs FOR SELECT TO authenticated
    USING (public.is_event_member(event_id));

CREATE POLICY "members can insert video_jobs"
    ON public.video_jobs FOR INSERT TO authenticated
    WITH CHECK (public.is_event_member(event_id));

CREATE POLICY "members can update video_jobs"
    ON public.video_jobs FOR UPDATE TO authenticated
    USING (public.is_event_member(event_id))
    WITH CHECK (public.is_event_member(event_id));

CREATE POLICY "owners can delete video_jobs"
    ON public.video_jobs FOR DELETE TO authenticated
    USING (public.is_event_member(event_id) AND public.event_role(event_id) IN ('owner', 'admin'));
