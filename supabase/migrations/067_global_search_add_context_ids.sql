-- Add context_event_id and context_vendor_id to global_search results so the
-- client can construct correct deep-link URLs for vendors and styles.
-- Must DROP first because CREATE OR REPLACE cannot change the return type.
-- Output columns are named context_event_id / context_vendor_id to avoid
-- a name clash with the input parameter "event_id".

DROP FUNCTION IF EXISTS global_search(TEXT, TEXT[], UUID);

CREATE FUNCTION global_search(
  search_query TEXT,
  search_types TEXT[] DEFAULT ARRAY['vendors', 'styles', 'events'],
  event_id UUID DEFAULT NULL
)
RETURNS TABLE (
  type TEXT,
  id UUID,
  name TEXT,
  snippet TEXT,
  rank REAL,
  context_event_id UUID,
  context_vendor_id UUID
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    'vendor'::TEXT AS type,
    v.id,
    v.company_name AS name,
    coalesce(v.country_of_origin, v.contact_person, '') AS snippet,
    ts_rank(v.search_tsv, plainto_tsquery('english', search_query)) AS rank,
    v.event_id AS context_event_id,
    NULL::UUID AS context_vendor_id
  FROM vendors v
  WHERE
    v.search_tsv @@ plainto_tsquery('english', search_query)
    AND v.deleted_at IS NULL
    AND (global_search.event_id IS NULL OR v.event_id = global_search.event_id)
    AND 'vendors' = ANY(search_types)

  UNION ALL

  SELECT
    'style'::TEXT AS type,
    s.id,
    coalesce(s.name, s.item_code) AS name,
    coalesce(s.category, s.composition, '') AS snippet,
    ts_rank(s.search_tsv, plainto_tsquery('english', search_query)) AS rank,
    v.event_id AS context_event_id,
    s.vendor_id AS context_vendor_id
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
    'event'::TEXT AS type,
    e.id,
    e.name,
    coalesce(e.city, e.venue, '') AS snippet,
    ts_rank(e.search_tsv, plainto_tsquery('english', search_query)) AS rank,
    NULL::UUID AS context_event_id,
    NULL::UUID AS context_vendor_id
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
