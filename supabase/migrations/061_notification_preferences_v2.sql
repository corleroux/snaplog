-- Notification Preferences Table v2
-- Stores user notification preferences
-- This migration replaces the schema from migration 056

-- Drop old notification_preferences table (from migration 056) to recreate with new schema
DROP TABLE IF EXISTS public.notification_preferences CASCADE;

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  enabled boolean not null default true,
  channel_email boolean not null default true,
  channel_in_app boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, event_type)
);

-- Index for user lookups
create index if not exists notification_preferences_user_idx on public.notification_preferences(user_id);

-- updated_at trigger function
create or replace function public.notification_preferences_updated_at_func()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Enable updated_at trigger
create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row
  execute procedure public.notification_preferences_updated_at_func();

-- RLS Policies
alter table public.notification_preferences enable row level security;

-- Users can view their own preferences
create policy "Users can view own notification preferences"
  on public.notification_preferences for select
  to authenticated
  using (user_id = auth.uid());

-- Users can insert their own preferences
create policy "Users can insert own notification preferences"
  on public.notification_preferences for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can update their own preferences
create policy "Users can update own notification preferences"
  on public.notification_preferences for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Default preferences function
create or replace function public.ensure_default_preferences(p_user_id uuid)
returns void as $$
begin
  insert into public.notification_preferences (user_id, event_type, enabled, channel_email, channel_in_app)
  values
    (p_user_id, 'vendor_created', true, true, true),
    (p_user_id, 'vendor_updated', true, false, true),
    (p_user_id, 'style_created', true, true, true),
    (p_user_id, 'style_committed', true, true, true),
    (p_user_id, 'extraction_error', true, true, true),
    (p_user_id, 'extraction_complete', true, false, true),
    (p_user_id, 'user_invited', true, true, true),
    (p_user_id, 'user_role_changed', true, true, true),
    (p_user_id, 'event_shared', true, false, true)
  on conflict (user_id, event_type) do nothing;
end;
$$ language plpgsql security definer;

-- Grant execute on helper function
grant execute on function public.ensure_default_preferences to authenticated;

-- Trigger to ensure default preferences on user signup
create or replace function public.create_default_preferences_on_signup()
returns trigger as $$
begin
  perform public.ensure_default_preferences(new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger (this will be enabled when auth.users is accessible)
-- drop trigger if exists on_auth_user_created on auth.users;
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row
--   execute procedure public.create_default_preferences_on_signup();

-- Comment
comment on table public.notification_preferences is 'User notification preferences by event type';
comment on column public.notification_preferences.event_type is 'Event type: vendor_created, vendor_updated, style_created, style_committed, extraction_error, extraction_complete, user_invited, user_role_changed, event_shared';
comment on column public.notification_preferences.channel_email is 'Whether to send email notifications for this event type';
comment on column public.notification_preferences.channel_in_app is 'Whether to send in-app notifications for this event type';
