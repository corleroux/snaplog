-- Add sort_order column for manual drag-and-drop reordering of vendors
-- Backfill existing rows to 0 (maintains current alphabetical order by sort_order ASC)
-- Index supports efficient ordering queries per event

ALTER TABLE vendors ADD COLUMN sort_order INTEGER;

UPDATE vendors SET sort_order = 0 WHERE sort_order IS NULL;

CREATE INDEX idx_vendors_sort_order ON vendors(event_id, sort_order);

-- RLS policies on vendors already cover all columns including sort_order (migration 014)
-- No policy changes needed