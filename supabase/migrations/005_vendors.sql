create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  company_name text not null,
  booth_number text,
  country_of_origin text,
  address text,
  brand_names jsonb not null default '[]'::jsonb,
  contact_person text,
  email text,
  phone text,
  whatsapp text,
  website_url text,
  notes text,
  source text not null default 'manual' check (source in ('manual', 'scan', 'ai', 'import')),
  status text not null default 'active' check (status in ('active', 'hidden', 'archived')),
  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vendor_images (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  storage_path text not null,
  public_url text,
  image_type text not null default 'gallery'
    check (image_type in ('gallery', 'business_card', 'booth_sign', 'brochure', 'logo')),
  is_primary boolean not null default false,
  width integer,
  height integer,
  file_size_bytes bigint,
  mime_type text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

drop trigger if exists trg_vendors_updated_at on public.vendors;
create trigger trg_vendors_updated_at
before update on public.vendors
for each row
execute procedure public.set_updated_at();

create index if not exists idx_vendors_event_id on public.vendors(event_id);
create index if not exists idx_vendors_brand_names_gin on public.vendors using gin(brand_names);
create index if not exists idx_vendor_images_vendor_id on public.vendor_images(vendor_id);
