-- Add missing INSERT, UPDATE, DELETE policies for events table
-- This fixes the chicken-and-egg problem where users can't create events
-- because they're not members yet

-- Allow authenticated users to create events
-- The eventRepository will automatically add the creator as an owner
CREATE POLICY "authenticated users can create events"
ON public.events FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow event members (owners/admins) to update events
CREATE POLICY "members can update events"
ON public.events FOR UPDATE
USING (public.is_event_member(id))
WITH CHECK (
  public.is_event_member(id)
  AND EXISTS (
    SELECT 1 FROM public.event_members em
    WHERE em.event_id = events.id
      AND em.user_id = auth.uid()
      AND em.role IN ('owner', 'admin')
  )
);

-- Allow event owners to delete events
CREATE POLICY "owners can delete events"
ON public.events FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.event_members em
    WHERE em.event_id = events.id
      AND em.user_id = auth.uid()
      AND em.role = 'owner'
  )
);
