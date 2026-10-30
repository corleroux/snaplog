create table if not exists public.inventory_records (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.fabric_variants(id) on delete cascade,
  style_id uuid not null references public.fabric_styles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,

  quantity numeric not null default 0,
  unit text not null,
  batch_no text,
  stock_status text default 'in_stock'
    check (stock_status in ('in_stock', 'low_stock', 'reserved', 'sample_only', 'out_of_stock')),

  captured_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inventory_variant_id on public.inventory_records(variant_id);
create index if not exists idx_inventory_style_id on public.inventory_records(style_id);
create index if not exists idx_inventory_event_id on public.inventory_records(event_id);

drop trigger if exists trg_inventory_records_updated_at on public.inventory_records;
create trigger trg_inventory_records_updated_at
before update on public.inventory_records
for each row
execute procedure public.set_updated_at();
