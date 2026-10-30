create table if not exists public.scan_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete set null,
  style_id uuid references public.fabric_styles(id) on delete set null,

  scan_type text not null check (
    scan_type in (
      'vendor_card',
      'vendor_signage',
      'vendor_brochure',
      'vendor_catalog',
      'product_tag',
      'stock_sheet',
      'fabric_card',
      'multi_variant_sheet'
    )
  ),
  source_image_path text,
  source_image_url text,

  extraction_status text not null default 'pending'
    check (extraction_status in ('pending', 'processing', 'complete', 'failed')),
  extractor_name text,
  extractor_model text,
  extractor_version text,

  raw_payload jsonb,
  normalized_payload jsonb,
  reviewed_payload jsonb,
  confidence_scores jsonb,

  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  error_message text,

  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_scan_sessions_event_id on public.scan_sessions(event_id);
create index if not exists idx_scan_sessions_vendor_id on public.scan_sessions(vendor_id);
create index if not exists idx_scan_sessions_style_id on public.scan_sessions(style_id);
create index if not exists idx_scan_sessions_raw_payload_gin on public.scan_sessions using gin(raw_payload);
create index if not exists idx_scan_sessions_normalized_payload_gin on public.scan_sessions using gin(normalized_payload);
