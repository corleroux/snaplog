create table if not exists public.fabric_styles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,

  item_code text not null,
  name text,
  composition text,
  category text,
  construction text,
  finish text,

  width_cm numeric,
  width_in numeric,
  weight_gsm numeric,
  weight_ozsy numeric,

  pattern text,
  season text,

  metadata jsonb not null default '{}'::jsonb,

  source text not null default 'manual' check (source in ('manual', 'scan', 'ai', 'import')),
  status text not null default 'active' check (status in ('active', 'hidden', 'archived')),

  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (vendor_id, item_code)
);

create index if not exists idx_fabric_styles_event_id on public.fabric_styles(event_id);
create index if not exists idx_fabric_styles_vendor_id on public.fabric_styles(vendor_id);
create index if not exists idx_fabric_styles_item_code on public.fabric_styles(item_code);
create index if not exists idx_fabric_styles_metadata_gin on public.fabric_styles using gin(metadata);

drop trigger if exists trg_fabric_styles_updated_at on public.fabric_styles;
create trigger trg_fabric_styles_updated_at
before update on public.fabric_styles
for each row
execute procedure public.set_updated_at();
