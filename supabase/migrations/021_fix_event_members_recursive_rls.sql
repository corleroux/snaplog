-- Fix recursive RLS policy on event_members table
--
-- The original policy "members can read event_members" used is_event_member(event_id),
-- which queries event_members, creating infinite recursion because:
-- 1. is_event_member() queries event_members
-- 2. event_members RLS policy calls is_event_member()
--
-- Fix: Use direct auth.uid() = user_id check instead

-- Drop the problematic policy
drop policy if exists "members can read event_members" on public.event_members;

-- Create corrected policy that checks user_id directly
create policy "members can read event_members"
on public.event_members for select
using (auth.uid() = user_id);
