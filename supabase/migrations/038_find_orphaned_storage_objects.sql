-- Migration: find_orphaned_storage_objects
-- Adds an RPC function for efficiently finding orphaned storage objects.
-- Used by the cleanup-orphaned-images edge function.

create or replace function public.find_orphaned_storage_objects(
  p_bucket_id text,
  p_batch_size int default 100
)
returns table (
  name text,
  created_at timestamptz
)
language sql
security definer
as $$
  select
    o.name,
    o.created_at
  from storage.objects o
  where o.bucket_id = p_bucket_id
    -- Grace period: only consider objects older than 24 hours
    and o.created_at < now() - interval '24 hours'
    -- Not referenced in vendor_images
    and not exists (
      select 1
      from public.vendor_images vi
      where vi.storage_path = o.name
    )
    -- Not referenced in fabric_images
    and not exists (
      select 1
      from public.fabric_images fi
      where fi.storage_path = o.name
    )
  order by o.created_at asc
  limit p_batch_size;
$$;

-- Grant execute to authenticated users (authorization is handled in the edge function)
grant execute on function public.find_orphaned_storage_objects(text, int) to authenticated;
grant execute on function public.find_orphaned_storage_objects(text, int) to service_role;
