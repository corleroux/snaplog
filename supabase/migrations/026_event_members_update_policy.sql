-- Add UPDATE policy for event_members
-- Allows owners/admins to change member roles

CREATE POLICY "owners and admins can update member roles"
ON public.event_members FOR UPDATE
USING (
  public.is_event_member(event_id)
  AND EXISTS (
    SELECT 1 FROM public.event_members em
    WHERE em.event_id = event_members.event_id
      AND em.user_id = auth.uid()
      AND em.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  public.is_event_member(event_id)
  AND EXISTS (
    SELECT 1 FROM public.event_members em
    WHERE em.event_id = event_members.event_id
      AND em.user_id = auth.uid()
      AND em.role IN ('owner', 'admin')
  )
);
