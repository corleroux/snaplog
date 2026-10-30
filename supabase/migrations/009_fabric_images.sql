create table if not exists public.fabric_images (
  id uuid primary key default gen_random_uuid(),
  style_id uuid references public.fabric_styles(id) on delete cascade,
  variant_id uuid references public.fabric_variants(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,

  storage_path text not null,
  public_url text,
  image_role text not null default 'gallery'
    check (image_role in ('thumbnail', 'gallery', 'swatch', 'scan_original', 'detail')),
  is_primary boolean not null default false,

  width integer,
  height integer,
  file_size_bytes bigint,
  mime_type text,

  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),

  check (style_id is not null or variant_id is not null)
);

create index if not exists idx_fabric_images_style_id on public.fabric_images(style_id);
create index if not exists idx_fabric_images_variant_id on public.fabric_images(variant_id);
