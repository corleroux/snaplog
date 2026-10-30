create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  style_id uuid references public.fabric_styles(id) on delete cascade,
  variant_id uuid references public.fabric_variants(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,

  currency text not null default 'USD',
  price numeric not null,
  price_unit text not null,
  minimum_order_quantity numeric,
  minimum_order_unit text,
  lead_time_value integer,
  lead_time_unit text,
  notes text,

  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),

  check (style_id is not null or variant_id is not null)
);

create index if not exists idx_price_history_style_id on public.price_history(style_id);
create index if not exists idx_price_history_variant_id on public.price_history(variant_id);
