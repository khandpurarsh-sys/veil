create or replace function veil_private.check_send() returns trigger language plpgsql security definer set search_path='' as $$begin
 if not veil_private.is_active() or new.sender<>auth.uid() or new.epoch<>(select epoch from public.veil_circle) or (select paused from public.veil_circle) then raise exception 'Not permitted or roster changed';end if;
 if new.envelope->'payload'->>'id' is distinct from new.id::text or new.envelope->'payload'->>'sender' is distinct from new.sender::text or new.envelope->'payload'->>'room' is distinct from new.room or (new.envelope->'payload'->>'epoch')::int is distinct from new.epoch then raise exception 'Envelope context mismatch';end if;
 if (select count(*) from public.veil_messages where sender=auth.uid() and created_at>now()-interval '1 minute')>=30 then raise exception 'Please wait before sending more';end if;
 new.created_at=now();new.expires_at=now()+interval '30 days';return new;
end$$;

revoke execute on function veil_private.check_send() from public,anon,authenticated;
