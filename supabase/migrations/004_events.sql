create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  city text,
  country text,
  venue text,
  starts_on date,
  ends_on date,
  cover_image_url text,
  status text not null default 'active' check (status in ('active', 'upcoming', 'archived')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
before update on public.events
for each row
execute procedure public.set_updated_at();

create index if not exists idx_event_members_event_id on public.event_members(event_id);
create index if not exists idx_event_members_user_id on public.event_members(user_id);
