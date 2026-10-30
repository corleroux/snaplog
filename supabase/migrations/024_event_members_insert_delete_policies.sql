-- RLS Policies for Event Members Management
-- Allows owners and admins to add/remove members

-- Enable RLS on event_members table
ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean migration)
DROP POLICY IF EXISTS "members can add members" ON public.event_members;
DROP POLICY IF EXISTS "members can remove members" ON public.event_members;

-- Policy: Allow members to insert new members (if they are owner/admin)
CREATE POLICY "members can add members"
ON public.event_members FOR INSERT
WITH CHECK (
  public.is_event_member(event_id)
  AND EXISTS (
    SELECT 1 FROM public.event_members em
    WHERE em.event_id = event_members.event_id
      AND em.user_id = auth.uid()
      AND em.role IN ('owner', 'admin')
  )
  AND role = 'editor' -- Only allow adding as editor
);

-- Policy: Allow owners and admins to remove other members (but not the last owner)
CREATE POLICY "members can remove members"
ON public.event_members FOR DELETE
USING (
  public.is_event_member(event_id)
  AND EXISTS (
    SELECT 1 FROM public.event_members em
    WHERE em.event_id = event_members.event_id
      AND em.user_id = auth.uid()
      AND em.role IN ('owner', 'admin')
  )
  AND NOT EXISTS (
    -- Prevent removing the last owner
    SELECT 1 FROM public.event_members em2
    WHERE em2.event_id = event_members.event_id
      AND em2.role = 'owner'
  )
  OR (
    -- Allow removal if there are other owners
    EXISTS (
      SELECT 1 FROM public.event_members em2
      WHERE em2.event_id = event_members.event_id
        AND em2.role = 'owner'
        AND em2.id <> event_members.id
    )
  )
);
