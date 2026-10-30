-- ARCH-17: Fix event_members SELECT policy
--
-- The current policy (auth.uid() = user_id) only lets users see their own
-- membership row. The UI needs to show all members of an event.
--
-- Uses a SECURITY DEFINER function to break the RLS recursion that would
-- otherwise occur (is_event_member queries event_members, which triggers
-- the RLS policy, which calls is_event_member again...).

-- Helper that bypasses RLS to safely check event membership
CREATE OR REPLACE FUNCTION public.is_event_member_rls_safe(target_event_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_members em
    WHERE em.event_id = target_event_id
      AND em.user_id = auth.uid()
  );
$$;

-- Replace the self-only policy with one that shows all members of your events
DROP POLICY IF EXISTS "members can read event_members" ON public.event_members;

CREATE POLICY "members can read event_members"
  ON public.event_members FOR SELECT TO authenticated
  USING (public.is_event_member_rls_safe(event_id));
