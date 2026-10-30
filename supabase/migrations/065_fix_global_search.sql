-- Fix global_search function: events table has no deleted_at column (uses status instead).
-- Migration 043 referenced e.deleted_at which caused function creation to fail.
-- Also re-applies tsvector columns and indexes idempotently in case 043 was rolled back.

-- Enable pg_trgm if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes (idempotent)
CREATE INDEX IF NOT EXISTS vendors_name_trgm_idx ON vendors USING gin (company_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS fabric_styles_name_trgm_idx ON fabric_styles USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS events_name_trgm_idx ON events USING gin (name gin_trgm_ops);

-- tsvector generated columns (idempotent via IF NOT EXISTS)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(company_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(contact_person, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(country_of_origin, '')), 'C')
) STORED;

ALTER TABLE fabric_styles ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(item_code, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(season, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(composition, '')), 'C')
) STORED;

ALTER TABLE events ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(city, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(venue, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(country, '')), 'C')
) STORED;

-- GIN indexes on tsvector columns (idempotent)
CREATE INDEX IF NOT EXISTS vendors_search_idx ON vendors USING gin (search_tsv);
CREATE INDEX IF NOT EXISTS fabric_styles_search_idx ON fabric_styles USING gin (search_tsv);
CREATE INDEX IF NOT EXISTS events_search_idx ON events USING gin (search_tsv);

-- Re-create search_history table (idempotent)
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  result_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS search_history_user_id_idx ON search_history(user_id);
CREATE INDEX IF NOT EXISTS search_history_created_at_idx ON search_history(created_at DESC);

ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'search_history' AND policyname = 'Users can view own search history'
  ) THEN
    CREATE POLICY "Users can view own search history"
      ON search_history FOR SELECT
      USING (auth.uid() = user_id AND deleted_at IS NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'search_history' AND policyname = 'Users can insert own search history'
  ) THEN
    CREATE POLICY "Users can insert own search history"
      ON search_history FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'search_history' AND policyname = 'Users can delete own search history'
  ) THEN
    CREATE POLICY "Users can delete own search history"
      ON search_history FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Corrected global_search function: events uses status column, not deleted_at
CREATE OR REPLACE FUNCTION global_search(
  search_query TEXT,
  search_types TEXT[] DEFAULT ARRAY['vendors', 'styles', 'events'],
  event_id UUID DEFAULT NULL
)
RETURNS TABLE (
  type TEXT,
  id UUID,
  name TEXT,
  snippet TEXT,
  rank REAL
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    'vendor'::TEXT as type,
    v.id,
    v.company_name AS name,
    coalesce(v.country_of_origin, v.contact_person, '') AS snippet,
    ts_rank(v.search_tsv, plainto_tsquery('english', search_query)) as rank
  FROM vendors v
  WHERE
    v.search_tsv @@ plainto_tsquery('english', search_query)
    AND v.deleted_at IS NULL
    AND (global_search.event_id IS NULL OR v.event_id = global_search.event_id)
    AND 'vendors' = ANY(search_types)

  UNION ALL

  SELECT
    'style'::TEXT as type,
    s.id,
    coalesce(s.name, s.item_code) AS name,
    coalesce(s.category, s.composition, '') AS snippet,
    ts_rank(s.search_tsv, plainto_tsquery('english', search_query)) as rank
  FROM fabric_styles s
  INNER JOIN vendors v ON s.vendor_id = v.id
  WHERE
    s.search_tsv @@ plainto_tsquery('english', search_query)
    AND s.deleted_at IS NULL
    AND v.deleted_at IS NULL
    AND (global_search.event_id IS NULL OR v.event_id = global_search.event_id)
    AND 'styles' = ANY(search_types)

  UNION ALL

  SELECT
    'event'::TEXT as type,
    e.id,
    e.name,
    coalesce(e.city, e.venue, '') AS snippet,
    ts_rank(e.search_tsv, plainto_tsquery('english', search_query)) as rank
  FROM events e
  WHERE
    e.search_tsv @@ plainto_tsquery('english', search_query)
    AND e.status != 'archived'
    AND 'events' = ANY(search_types)

  ORDER BY rank DESC, name ASC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION global_search TO authenticated;
