create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  draft_type text not null
    check (draft_type in ('vendor', 'style', 'variant_scan')),
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'extracting', 'review', 'uploading', 'failed', 'synced')),
  payload jsonb not null,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_drafts_updated_at on public.drafts;
create trigger trg_drafts_updated_at
before update on public.drafts
for each row
execute procedure public.set_updated_at();
