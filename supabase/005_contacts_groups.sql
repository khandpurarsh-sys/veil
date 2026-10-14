create table public.veil_contacts(owner_id uuid not null references public.veil_members(id),contact_id uuid not null references public.veil_members(id),created_at timestamptz not null default now(),primary key(owner_id,contact_id),check(owner_id<>contact_id));
alter table public.veil_contacts enable row level security;
create policy contacts_read on public.veil_contacts for select to authenticated using(owner_id=auth.uid() and veil_private.is_active());
create policy contacts_add on public.veil_contacts for insert to authenticated with check(owner_id=auth.uid() and veil_private.is_active() and exists(select 1 from veil_members where id=contact_id and status='active'));
create policy contacts_remove on public.veil_contacts for delete to authenticated using(owner_id=auth.uid());
grant select,insert,delete on public.veil_contacts to authenticated;
create table public.veil_groups(id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 1 and 40),created_by uuid not null references public.veil_members(id),created_at timestamptz not null default now());
create table public.veil_group_members(group_id uuid not null references public.veil_groups(id),member_id uuid not null references public.veil_members(id),primary key(group_id,member_id));
alter table public.veil_groups enable row level security;
alter table public.veil_group_members enable row level security;
create function veil_private.in_group(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$select veil_private.is_active() and exists(select 1 from public.veil_group_members where group_id=p_id and member_id=auth.uid())$$;
revoke all on function veil_private.in_group(uuid) from public,anon;grant execute on function veil_private.in_group(uuid) to authenticated;
create policy groups_read on public.veil_groups for select to authenticated using(veil_private.in_group(id));
create policy group_members_read on public.veil_group_members for select to authenticated using(veil_private.in_group(group_id));
grant select on public.veil_groups,public.veil_group_members to authenticated;
create function public.veil_create_group(p_name text,p_ids uuid[]) returns uuid language plpgsql security definer set search_path='' as $$declare gid uuid;begin
 if not veil_private.is_owner() then raise exception 'Owner only';end if;
 if cardinality(p_ids)<1 or cardinality(p_ids)>20 or not auth.uid()=any(p_ids) then raise exception 'Invalid membership';end if;
 if exists(select 1 from unnest(p_ids) x where not exists(select 1 from public.veil_members where id=x and status='active')) then raise exception 'Only approved devices';end if;
 insert into public.veil_groups(name,created_by) values(p_name,auth.uid()) returning id into gid;
 insert into public.veil_group_members(group_id,member_id) select gid,unnest(p_ids);return gid;
end$$;
revoke all on function public.veil_create_group(text,uuid[]) from public,anon;grant execute on function public.veil_create_group(text,uuid[]) to authenticated;
create or replace function veil_private.can_room(p_room text) returns boolean language sql stable security definer set search_path='' as $$
 select veil_private.is_active() and (p_room in ('inner','after','quiet') or
 case when p_room ~ '^group:[0-9a-f-]{36}$' then veil_private.in_group(substring(p_room from 7)::uuid) else false end or
 (p_room ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$' and auth.uid()::text in (split_part(p_room,':',2),split_part(p_room,':',3)) and split_part(p_room,':',2)<split_part(p_room,':',3) and (select count(*) from public.veil_members where id::text in (split_part(p_room,':',2),split_part(p_room,':',3)) and status='active')=2))
$$;
alter table public.veil_messages drop constraint veil_messages_room_check;
alter table public.veil_messages add constraint veil_messages_room_check check(room in ('inner','after','quiet') or room ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$' or room ~ '^group:[0-9a-f-]{36}$');
