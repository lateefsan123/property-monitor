-- Existing sellers remain unchanged; only new importer requests supply a key.
-- A lost HTTP response can safely be retried without adding the same row twice.
set lock_timeout = '5s';
alter table public.leads add column if not exists import_key uuid;
create unique index if not exists leads_user_import_key
  on public.leads (user_id, import_key);
alter table public.lead_sources add column if not exists import_options jsonb;
notify pgrst, 'reload schema';
