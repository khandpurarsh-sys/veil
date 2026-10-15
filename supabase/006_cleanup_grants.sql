-- The cleanup Edge Function uses the service role only to read expiry metadata
-- and delete expired records after the Storage API has removed their bytes.
grant select, delete on public.veil_files, public.veil_messages to service_role;
-- Live scheduling uses pg_cron hourly and pg_net to invoke veil-expiry-cleanup.
-- Its per-job token is stored in Supabase Vault, never in source control.
