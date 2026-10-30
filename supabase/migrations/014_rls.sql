alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_images enable row level security;
alter table public.fabric_styles enable row level security;
alter table public.fabric_variants enable row level security;
alter table public.inventory_records enable row level security;
alter table public.fabric_images enable row level security;
alter table public.scan_sessions enable row level security;
alter table public.price_history enable row level security;
alter table public.drafts enable row level security;

create policy "members can read events"
on public.events for select
using (public.is_event_member(id));

create policy "members can read event_members"
on public.event_members for select
using (public.is_event_member(event_id));

create policy "members can read vendors"
on public.vendors for select
using (public.is_event_member(event_id));

create policy "members can insert vendors"
on public.vendors for insert
with check (public.is_event_member(event_id) and created_by = auth.uid());

create policy "members can update vendors"
on public.vendors for update
using (public.is_event_member(event_id))
with check (public.is_event_member(event_id));

create policy "members can read vendor_images"
on public.vendor_images for select
using (public.is_event_member(event_id));

create policy "members can manage vendor_images"
on public.vendor_images for all
using (public.is_event_member(event_id))
with check (public.is_event_member(event_id));

create policy "members can read fabric_styles"
on public.fabric_styles for select
using (public.is_event_member(event_id));

create policy "members can manage fabric_styles"
on public.fabric_styles for all
using (public.is_event_member(event_id))
with check (public.is_event_member(event_id));

create policy "members can read fabric_variants"
on public.fabric_variants for select
using (public.is_event_member(event_id));

create policy "members can manage fabric_variants"
on public.fabric_variants for all
using (public.is_event_member(event_id))
with check (public.is_event_member(event_id));

create policy "members can read inventory_records"
on public.inventory_records for select
using (public.is_event_member(event_id));

create policy "members can manage inventory_records"
on public.inventory_records for all
using (public.is_event_member(event_id))
with check (public.is_event_member(event_id));

create policy "members can read fabric_images"
on public.fabric_images for select
using (public.is_event_member(event_id));

create policy "members can manage fabric_images"
on public.fabric_images for all
using (public.is_event_member(event_id))
with check (public.is_event_member(event_id));

create policy "members can read scan_sessions"
on public.scan_sessions for select
using (public.is_event_member(event_id));

create policy "members can manage scan_sessions"
on public.scan_sessions for all
using (public.is_event_member(event_id))
with check (public.is_event_member(event_id));

create policy "members can read price_history"
on public.price_history for select
using (public.is_event_member(event_id));

create policy "members can manage price_history"
on public.price_history for all
using (public.is_event_member(event_id))
with check (public.is_event_member(event_id));

create policy "owners can manage drafts"
on public.drafts for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
