-- Notifications Table v2
-- Stores in-app notifications for users
-- This migration replaces the schema from migration 054

-- Drop old notifications table (from migration 054) to recreate with new schema
DROP TABLE IF EXISTS public.notifications CASCADE;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('info', 'success', 'warning', 'error')),
  title text not null,
  body text,
  action_url text,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- Indexes for common queries
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(user_id, read, created_at desc);

-- RLS Policies
alter table public.notifications enable row level security;

-- Users can read their own notifications
create policy "Users can view own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Service role can insert notifications (for triggers/edge functions)
create policy "Service role can insert notifications"
  on public.notifications for insert
  to service_role
  with check (true);

-- Users can delete their own notifications
create policy "Users can delete own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

-- Helper function to mark all notifications as read
create or replace function public.mark_notifications_read(p_user_id uuid default auth.uid())
returns void as $$
begin
  update public.notifications
  set read = true, read_at = now()
  where user_id = p_user_id and read = false;
end;
$$ language plpgsql security definer;

-- Grant execute on helper function
grant execute on function public.mark_notifications_read to authenticated;

-- Comment
comment on table public.notifications is 'In-app notifications for users';
comment on column public.notifications.type is 'Notification type: info, success, warning, error';
comment on column public.notifications.action_url is 'Optional deep link URL when notification is clicked';
