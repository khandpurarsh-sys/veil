-- Separate one-to-one rooms from circle rooms. Only both named active devices can read.
create or replace function veil_private.can_room(p_room text) returns boolean language sql stable security definer set search_path='' as $$
 select veil_private.is_active() and (p_room in ('inner','after','quiet') or
 (p_room ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$' and auth.uid()::text in (split_part(p_room,':',2),split_part(p_room,':',3)) and
 split_part(p_room,':',2)<split_part(p_room,':',3) and
 (select count(*) from public.veil_members where id::text in (split_part(p_room,':',2),split_part(p_room,':',3)) and status='active')=2))
$$;
revoke all on function veil_private.can_room(text) from public,anon;
grant execute on function veil_private.can_room(text) to authenticated;
alter table public.veil_messages drop constraint veil_messages_room_check;
alter table public.veil_messages add constraint veil_messages_room_check check(room in ('inner','after','quiet') or room ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$');
drop policy message_read on public.veil_messages;
create policy message_read on public.veil_messages for select to authenticated using(veil_private.can_room(room) and expires_at>now());
drop policy message_send on public.veil_messages;
create policy message_send on public.veil_messages for insert to authenticated with check(veil_private.can_room(room) and sender=auth.uid());
