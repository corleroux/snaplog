create table if not exists public.fabric_variants (
  id uuid primary key default gen_random_uuid(),
  style_id uuid not null references public.fabric_styles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,

  color_code text,
  color_name text,
  variant_name text,
  wash_code text,
  finish_override text,

  status text not null default 'active'
    check (status in ('active', 'sample', 'partial', 'discontinued')),

  metadata jsonb not null default '{}'::jsonb,

  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fabric_variants_style_id on public.fabric_variants(style_id);
create index if not exists idx_fabric_variants_event_id on public.fabric_variants(event_id);
create index if not exists idx_fabric_variants_vendor_id on public.fabric_variants(vendor_id);
create index if not exists idx_fabric_variants_metadata_gin on public.fabric_variants using gin(metadata);

drop trigger if exists trg_fabric_variants_updated_at on public.fabric_variants;
create trigger trg_fabric_variants_updated_at
before update on public.fabric_variants
for each row
execute procedure public.set_updated_at();
