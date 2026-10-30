-- Replace permissive storage policies with event-scoped access control
-- for the scan-originals bucket.
--
-- Previous policies (from 016_create_scan_originals_bucket.sql) allowed any
-- authenticated user to read/upload/delete all objects. These are replaced
-- with policies that restrict access based on event membership derived from
-- the object path: {event_id}/{scan_session_id}/{filename}
--
-- Uses existing helpers:
--   public.is_event_member(event_id uuid) -> boolean
--   public.event_role(event_id uuid) -> text
--
-- The service_role policy is NOT touched — edge functions retain full access.

-- ============================================================================
-- 1. Drop permissive policies
-- ============================================================================

drop policy if exists "Authenticated users can upload to scan-originals"
  on storage.objects;

drop policy if exists "Authenticated users can read own scan originals"
  on storage.objects;

drop policy if exists "Authenticated users can delete own scan originals"
  on storage.objects;

-- ============================================================================
-- 2. SELECT — event members can read objects in their events
-- ============================================================================

create policy "Event members can read scan originals"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'scan-originals'
  and public.is_event_member((split_part(name, '/', 1))::uuid)
);

-- ============================================================================
-- 3. INSERT — event members can upload to their events
-- ============================================================================

create policy "Event members can upload to scan-originals"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'scan-originals'
  and public.is_event_member((split_part(name, '/', 1))::uuid)
);

-- ============================================================================
-- 4. UPDATE — event members can update objects in their events
-- ============================================================================

create policy "Event members can update scan originals"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'scan-originals'
  and public.is_event_member((split_part(name, '/', 1))::uuid)
)
with check (
  bucket_id = 'scan-originals'
  and public.is_event_member((split_part(name, '/', 1))::uuid)
);

-- ============================================================================
-- 5. DELETE — only owners and admins can delete objects
-- ============================================================================

create policy "Event owners and admins can delete scan originals"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'scan-originals'
  and public.event_role((split_part(name, '/', 1))::uuid) in ('owner', 'admin')
);
