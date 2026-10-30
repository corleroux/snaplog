-- Migration: Orphaned Storage Object Detection RPC
-- Purpose: Efficiently find orphaned images in storage for cleanup
-- Related: Edge function `cleanup-orphaned-images`
--
-- This RPC function queries storage.objects directly to find files older than
-- 24 hours that are NOT referenced in vendor_images.storage_path or
-- fabric_images.storage_path.

-- ============================================================================
-- FUNCTION: find_orphaned_storage_objects
-- ============================================================================
-- Returns: TABLE(name TEXT, created_at TIMESTAMPTZ)
-- Parameters:
--   p_bucket_id TEXT   - Storage bucket to scan (default: 'scan-originals')
--   p_batch_size INT   - Maximum orphans to return (default: 100)
-- ============================================================================
-- SAFETY:
-- - 24-hour grace period before considering an image orphaned
-- - Checks both vendor_images and fabric_images for references
-- - Returns only actual files (not folders) by checking for extensions
-- ============================================================================

CREATE OR REPLACE FUNCTION find_orphaned_storage_objects(
  p_bucket_id TEXT DEFAULT 'scan-originals',
  p_batch_size INT DEFAULT 100
)
RETURNS TABLE(
  name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_max_results INT := p_batch_size;
BEGIN
  -- Set cutoff to 24 hours ago
  v_cutoff := NOW() - INTERVAL '24 hours';

  -- Return query that finds orphaned objects
  RETURN QUERY
  SELECT
    so.name,
    so.created_at
  FROM storage.objects so
  WHERE so.bucket_id = p_bucket_id
    -- Only files (not folders) - check for extension
    AND so.name ~* '\.[a-z0-9]{2,4}$'
    -- Older than grace period
    AND so.created_at < v_cutoff
    -- NOT referenced in vendor_images
    AND NOT EXISTS (
      SELECT 1
      FROM vendor_images vi
      WHERE vi.storage_path = so.name
    )
    -- NOT referenced in fabric_images
    AND NOT EXISTS (
      SELECT 1
      FROM fabric_images fi
      WHERE fi.storage_path = so.name
    )
    -- Not already deleted
    AND so.deleted_at IS NULL
  ORDER BY so.created_at ASC
  LIMIT v_max_results;

END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Allow authenticated users to call this function (for the edge function)
-- The edge function uses service-role, but we grant to authenticated for flexibility
GRANT EXECUTE ON FUNCTION find_orphaned_storage_objects(TEXT, INT) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION find_orphaned_storage_objects IS
'Finds orphaned storage objects older than 24 hours not referenced in vendor_images or fabric_images.
Used by cleanup-orphaned-images edge function for efficient orphan detection.';
