-- Veil development schema. Run only in a dedicated FREE Supabase project.
-- Set the single intended owner's Supabase auth UUID in veil_private.config
-- from the dashboard after creating their durable owner identity. Never expose
-- a service-role key in the client. No automatic public-owner bootstrap exists.
create schema if not exists veil_private;
revoke all on schema veil_private from public;
create table veil_private.config (singleton boolean primary key default true check(singleton), owner_id uuid not null references auth.users(id));
create table public.veil_circle (singleton boolean primary key default true check(singleton), epoch integer not null default 0, roster jsonb, paused boolean not null default false);
insert into public.veil_circle(singleton) values(true);
create table public.veil_members (id uuid primary key references auth.users(id), alias text not null check(length(alias) between 1 and 24), box_public text not null, sign_public text not null, status text not null check(status in ('pending','active','removed')), joined_at timestamptz not null default now());
create table veil_private.invites (hash text primary key, expires_at timestamptz not null, used_by uuid references auth.users(id));
create table public.veil_messages (id uuid primary key, sender uuid not null references public.veil_members(id), room text not null check(room in ('inner','after','quiet')), epoch integer not null, envelope jsonb not null check(octet_length(envelope::text)<131072), created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '30 days');
create table public.veil_files (id uuid primary key, sender uuid not null references public.veil_members(id), bytes bigint not null check(bytes between 1 and 49000100), created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '30 days');
create or replace function veil_private.is_owner() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from veil_private.config where owner_id=auth.uid())$$;
create or replace function veil_private.is_active() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.veil_members where id=auth.uid() and status='active')$$;
create or replace function public.veil_owner() returns boolean language sql stable security definer set search_path='' as $$select veil_private.is_owner()$$;
create or replace function public.veil_create_invite(p_hash text) returns void language plpgsql security definer set search_path='' as $$begin
 if not veil_private.is_owner() then raise exception 'Owner only';end if;
 if length(p_hash)<>43 then raise exception 'Invalid invite hash';end if;
 insert into veil_private.invites values(p_hash,now()+interval '24 hours',null);
end$$;
create or replace function public.veil_accept_invite(p_hash text,p_alias text,p_box text,p_sign text) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 perform pg_advisory_xact_lock(8675309);
 if (select count(*) from public.veil_members where status in ('pending','active'))>=20 then raise exception 'Circle limit reached';end if;
 if exists(select 1 from public.veil_members where id=auth.uid()) then raise exception 'Device already registered';end if;
 if length(p_box)<>43 or length(p_sign)<>43 then raise exception 'Invalid device keys';end if;
 update veil_private.invites set used_by=auth.uid() where hash=p_hash and used_by is null and expires_at>now();
 if not found then raise exception 'Invitation expired or already used';end if;
 insert into public.veil_members(id,alias,box_public,sign_public,status) values(auth.uid(),p_alias,p_box,p_sign,'pending');
end$$;
create or replace function public.veil_revoke_invites() returns void language plpgsql security definer set search_path='' as $$begin
 if not veil_private.is_owner() then raise exception 'Owner only';end if;
 delete from veil_private.invites where used_by is null;
end$$;
create or replace function public.veil_commit_roster(p_epoch integer,p_roster jsonb,p_ids uuid[]) returns void language plpgsql security definer set search_path='' as $$begin
 if not veil_private.is_owner() then raise exception 'Owner only';end if;
 perform pg_advisory_xact_lock(8675309);
 if p_epoch<>(select epoch+1 from public.veil_circle) or cardinality(p_ids)>20 then raise exception 'Invalid epoch or size';end if;
 if not auth.uid()=any(p_ids) then raise exception 'Owner must remain';end if;
 if exists(select 1 from unnest(p_ids) x where not exists(select 1 from public.veil_members m where m.id=x and status in ('active','pending'))) then raise exception 'Unregistered member';end if;
 update public.veil_members set status=case when id=any(p_ids) then 'active' else 'removed' end where status in ('active','pending');
 update public.veil_circle set epoch=p_epoch,roster=p_roster where singleton;
end$$;
create or replace function public.veil_pause(p_paused boolean) returns void language plpgsql security definer set search_path='' as $$begin
 if not veil_private.is_owner() then raise exception 'Owner only';end if;
 update public.veil_circle set paused=p_paused where singleton;
end$$;
create or replace function veil_private.check_send() returns trigger language plpgsql security definer set search_path='' as $$begin
 if not veil_private.is_active() or new.sender<>auth.uid() or new.epoch<>(select epoch from public.veil_circle) or (select paused from public.veil_circle) then raise exception 'Not permitted or roster changed';end if;
 if new.envelope->'payload'->>'id' is distinct from new.id::text or new.envelope->'payload'->>'sender' is distinct from new.sender::text or new.envelope->'payload'->>'room' is distinct from new.room or (new.envelope->'payload'->>'epoch')::int is distinct from new.epoch then raise exception 'Envelope context mismatch';end if;
 if (select count(*) from public.veil_messages where sender=auth.uid() and created_at>now()-interval '1 minute')>=30 then raise exception 'Please wait before sending more';end if;
 new.created_at=now();new.expires_at=now()+interval '30 days';return new;
end$$;
create trigger veil_send_guard before insert on public.veil_messages for each row execute function veil_private.check_send();
create or replace function public.veil_reserve_file(p_id uuid,p_bytes bigint) returns void language plpgsql security definer set search_path='' as $$begin
 if not veil_private.is_active() or (select paused from public.veil_circle) then raise exception 'Uploads unavailable';end if;
 perform pg_advisory_xact_lock(8675310);
 if (select coalesce(sum(bytes),0) from public.veil_files)+p_bytes>800000000 then raise exception 'Free storage safety limit reached';end if;
 insert into public.veil_files(id,sender,bytes) values(p_id,auth.uid(),p_bytes);
end$$;
alter table public.veil_circle enable row level security;
alter table public.veil_members enable row level security;
alter table public.veil_messages enable row level security;
alter table public.veil_files enable row level security;
create policy circle_read on public.veil_circle for select to authenticated using(veil_private.is_active() or veil_private.is_owner());
create policy member_read on public.veil_members for select to authenticated using(veil_private.is_active() or veil_private.is_owner() or id=auth.uid());
create policy message_read on public.veil_messages for select to authenticated using(veil_private.is_active() and expires_at>now());
create policy message_send on public.veil_messages for insert to authenticated with check(veil_private.is_active() and sender=auth.uid());
create policy file_read on public.veil_files for select to authenticated using(veil_private.is_active() and expires_at>now());
create policy file_delete on public.veil_files for delete to authenticated using(veil_private.is_active() and (sender=auth.uid() or veil_private.is_owner()));
-- Required helper execution for RLS. Do not grant schema creation or table writes.
grant usage on schema veil_private to authenticated;
grant execute on function veil_private.is_owner(),veil_private.is_active() to authenticated;
revoke all on function public.veil_owner(),public.veil_create_invite(text),public.veil_accept_invite(text,text,text,text),public.veil_revoke_invites(),public.veil_commit_roster(integer,jsonb,uuid[]),public.veil_pause(boolean),public.veil_reserve_file(uuid,bigint) from public,anon;
grant execute on function public.veil_owner(),public.veil_create_invite(text),public.veil_accept_invite(text,text,text,text),public.veil_revoke_invites(),public.veil_commit_roster(integer,jsonb,uuid[]),public.veil_pause(boolean),public.veil_reserve_file(uuid,bigint) to authenticated;
grant select on public.veil_circle,public.veil_members,public.veil_messages,public.veil_files to authenticated;
grant insert on public.veil_messages to authenticated;
grant delete on public.veil_files to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('veil','veil',false,49000100,array['application/octet-stream']);
create policy veil_upload on storage.objects for insert to authenticated with check(bucket_id='veil' and veil_private.is_active() and exists(select 1 from public.veil_files f where f.sender=auth.uid() and f.id::text=name and f.expires_at>now()));
create policy veil_download on storage.objects for select to authenticated using(bucket_id='veil' and veil_private.is_active() and exists(select 1 from public.veil_files f where f.id::text=name and f.expires_at>now()));
create policy veil_remove on storage.objects for delete to authenticated using(bucket_id='veil' and veil_private.is_active() and exists(select 1 from public.veil_files f where f.id::text=name and (f.sender=auth.uid() or veil_private.is_owner())));
-- Enable Realtime on these tables in the dashboard. No plaintext or media keys stored here.
-- A separately deployed scheduled cleanup must DELETE storage objects via the Storage
-- API before removing expired veil_files records. Never delete storage.objects via SQL.
-- Expired content is immediately denied by RLS; physical deletion is not yet deployed.
create or replace function public.veil_register_owner(p_alias text,p_box text,p_sign text) returns void language plpgsql security definer set search_path='' as $$begin
 if not veil_private.is_owner() then raise exception 'Owner only';end if;
 if length(p_box)<>43 or length(p_sign)<>43 then raise exception 'Invalid keys';end if;
 insert into public.veil_members(id,alias,box_public,sign_public,status) values(auth.uid(),p_alias,p_box,p_sign,'active');
end$$;
revoke all on function public.veil_register_owner(text,text,text) from public,anon;
grant execute on function public.veil_register_owner(text,text,text) to authenticated;
