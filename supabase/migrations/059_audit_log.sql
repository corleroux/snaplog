-- Audit Log Table
-- Tracks all mutations to core entities for compliance and debugging

-- Drop existing table if it has old schema (created_at column missing)
DROP TABLE IF EXISTS public.audit_log CASCADE;

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('vendor', 'fabric_style', 'fabric_variant', 'fabric_image', 'event')),
  entity_id uuid not null,
  action text not null check (action in ('create', 'update', 'archive', 'delete', 'ERROR')),
  changes jsonb,
  performed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists audit_log_entity_idx on public.audit_log(entity_type, entity_id, created_at desc);
create index if not exists audit_log_performed_by_idx on public.audit_log(performed_by, created_at desc);
create index if not exists audit_log_action_idx on public.audit_log(action, created_at desc);
create index if not exists audit_log_created_at_idx on public.audit_log(created_at desc);

-- RLS Policies
alter table public.audit_log enable row level security;

-- Admins can read all audit logs
create policy "Admins can view audit logs"
  on public.audit_log for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'superadmin')
    )
  );

-- No insert policy - inserts are done via service role or triggers
-- No update/delete policies - audit logs are immutable

-- Grant select (no sequence needed - using UUID primary key)
grant select on public.audit_log to authenticated;

-- Comment
comment on table public.audit_log is 'Immutable audit trail of all entity mutations';
