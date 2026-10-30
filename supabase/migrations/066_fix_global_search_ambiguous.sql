-- Fix ambiguous column reference "event_id" in global_search.
-- Inside the function body, bare "event_id" is ambiguous between the
-- PL/pgSQL parameter and the table column. Qualify all parameter
-- references with the function name prefix (global_search.event_id).

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
