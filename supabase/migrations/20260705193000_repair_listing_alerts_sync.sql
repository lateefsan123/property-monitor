-- Repair the listing-alerts sync loop.
-- The previous cron used current_setting(...) values that were not configured
-- in production, so listing snapshots stopped refreshing.

create table if not exists public.listing_alerts_sync_tokens (
  id text primary key,
  token_hash text not null check (length(token_hash) = 64),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_listing_alerts_sync_tokens_updated_at on public.listing_alerts_sync_tokens;
create trigger set_listing_alerts_sync_tokens_updated_at
before update on public.listing_alerts_sync_tokens
for each row
execute function public.handle_updated_at();

alter table public.listing_alerts_sync_tokens enable row level security;

create table if not exists public.listing_alerts_sync_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null,
  source text not null,
  status text not null,
  force_fresh boolean not null default false,
  send_notifications boolean not null default true,
  started_at timestamptz not null,
  finished_at timestamptz not null default timezone('utc', now()),
  user_count integer not null default 0,
  watched_building_count integer not null default 0,
  tracked_listing_count integer not null default 0,
  change_count integer not null default 0,
  price_drop_count integer not null default 0,
  error_count integer not null default 0,
  results jsonb not null default '[]'::jsonb,
  error text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.listing_alerts_sync_runs enable row level security;

create index if not exists idx_listing_alerts_sync_runs_created_at
on public.listing_alerts_sync_runs (created_at desc);

do $$
declare
  existing_token text;
  generated_token text;
begin
  select decrypted_secret
  into existing_token
  from vault.decrypted_secrets
  where name = 'listing_alerts_sync_token'
  order by updated_at desc nulls last, created_at desc
  limit 1;

  if nullif(existing_token, '') is null then
    generated_token := encode(gen_random_bytes(32), 'hex');
    perform vault.create_secret(
      generated_token,
      'listing_alerts_sync_token',
      'Token used by pg_cron to invoke listing-alerts-sync.'
    );
    existing_token := generated_token;
  end if;

  insert into public.listing_alerts_sync_tokens (id, token_hash, active)
  values ('cron', encode(digest(existing_token, 'sha256'), 'hex'), true)
  on conflict (id) do update
    set token_hash = excluded.token_hash,
        active = true;
end $$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'listing-alerts-sync') then
    perform cron.unschedule('listing-alerts-sync');
  end if;
end $$;

select cron.schedule(
  'listing-alerts-sync',
  '0 5,14 * * *',
  $$
  with sync_secret as (
    select decrypted_secret as token
    from vault.decrypted_secrets
    where name = 'listing_alerts_sync_token'
    order by updated_at desc nulls last, created_at desc
    limit 1
  )
  select net.http_post(
    url := 'https://zrqxaammmrydkekbphqa.supabase.co/functions/v1/listing-alerts-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-listing-alerts-sync-token', (select token from sync_secret)
    ),
    body := jsonb_build_object(
      'forceFresh', true,
      'notify', true,
      'source', 'cron'
    ),
    timeout_milliseconds := 600000
  )
  where exists (select 1 from sync_secret where nullif(token, '') is not null);
  $$
);
