create or replace function public.is_event_member(target_event_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.event_members em
    where em.event_id = target_event_id
      and em.user_id = auth.uid()
  );
$$;

create or replace function public.event_role(target_event_id uuid)
returns text
language sql
stable
as $$
  select em.role
  from public.event_members em
  where em.event_id = target_event_id
    and em.user_id = auth.uid()
  limit 1
$$;
