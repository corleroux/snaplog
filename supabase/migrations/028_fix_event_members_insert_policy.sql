-- Fix event_members INSERT policy to allow:
-- 1. Event creators to add themselves as owner when creating a new event
-- 2. Existing owners/admins to add new members

-- Drop the old policy
DROP POLICY IF EXISTS "members can add members" ON public.event_members;

-- Create new policy that allows:
-- 1. Adding yourself as owner to an event you just created (created_by = auth.uid())
-- 2. Existing owners/admins adding members to events they're already part of
CREATE POLICY "users can add members"
ON public.event_members FOR INSERT
WITH CHECK (
  -- Allow event creator to add themselves as owner to events they created
  (event_id IN (SELECT id FROM public.events WHERE created_by = auth.uid()) AND user_id = auth.uid() AND role = 'owner')
  OR
  -- Allow existing owners/admins to add members as editors
  (public.is_event_member(event_id)
   AND EXISTS (
     SELECT 1 FROM public.event_members em
     WHERE em.event_id = event_members.event_id
       AND em.user_id = auth.uid()
       AND em.role IN ('owner', 'admin')
   )
   AND role = 'editor')
);
