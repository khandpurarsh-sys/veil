-- Avoid freeing a quota reservation while the stored ciphertext still exists.
drop policy if exists file_delete on public.veil_files;
create policy file_delete on public.veil_files for delete to authenticated using(
 veil_private.is_active() and (sender=auth.uid() or veil_private.is_owner())
 and not exists(select 1 from storage.objects where bucket_id='veil' and name=veil_files.id::text)
);
-- Message-time index for rate limits and room history.
create index if not exists veil_messages_room_time on public.veil_messages(room,created_at desc);
create index if not exists veil_messages_sender_time on public.veil_messages(sender,created_at desc);
create index if not exists veil_files_expiry on public.veil_files(expires_at);
