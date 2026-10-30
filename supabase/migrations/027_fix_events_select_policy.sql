-- Fix the events SELECT policy to allow users to read events they created
-- This fixes the chicken-and-egg problem where:
-- 1. User creates event (INSERT works)
-- 2. .select() tries to return the created row (SELECT fails because user isn't a member yet)
-- 3. User is then added as a member (but step 2 already failed)

-- Drop the old policy
DROP POLICY IF EXISTS "members can read events" ON public.events;

-- Create new policy that allows reading:
-- 1. Events where user is a member
-- 2. Events created by the user (for the initial create flow)
CREATE POLICY "users can read events"
ON public.events FOR SELECT
USING (
  public.is_event_member(id)
  OR created_by = auth.uid()
);
