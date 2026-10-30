-- Migration 070: Add is_shortlisted column to fabric_styles

ALTER TABLE public.fabric_styles
  ADD COLUMN is_shortlisted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_fabric_styles_is_shortlisted
  ON public.fabric_styles(event_id, is_shortlisted)
  WHERE is_shortlisted = true;

-- No new RLS policy needed: existing "members can update fabric_styles" policy covers all columns
