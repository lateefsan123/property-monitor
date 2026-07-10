create table if not exists public.seller_signal_auto_whatsapp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id integer not null references public.leads(id) on delete cascade,
  account_id uuid references public.whatsapp_accounts(id) on delete set null,
  message_id uuid references public.whatsapp_messages(id) on delete set null,
  transaction_date date not null,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'skipped', 'failed')),
  reason text,
  error_message text,
  run_id uuid,
  attempted_at timestamptz,
  sent_at timestamptz,
  cooldown_until timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, lead_id, transaction_date)
);

alter table public.whatsapp_messages
  add column if not exists send_source text not null default 'manual',
  add column if not exists market_transaction_date date,
  add column if not exists auto_send_event_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'whatsapp_messages_send_source_check'
      and conrelid = 'public.whatsapp_messages'::regclass
  ) then
    alter table public.whatsapp_messages
      add constraint whatsapp_messages_send_source_check
      check (send_source in ('manual', 'bulk', 'mcp', 'auto'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'whatsapp_messages_auto_send_event_id_fkey'
      and conrelid = 'public.whatsapp_messages'::regclass
  ) then
    alter table public.whatsapp_messages
      add constraint whatsapp_messages_auto_send_event_id_fkey
      foreign key (auto_send_event_id)
      references public.seller_signal_auto_whatsapp_events(id)
      on delete set null;
  end if;
end $$;

create unique index if not exists whatsapp_messages_lead_market_transaction_date_idx
  on public.whatsapp_messages (user_id, lead_id, market_transaction_date)
  where direction = 'outbound'
    and lead_id is not null
    and market_transaction_date is not null
    and status in ('queued', 'sending', 'sent', 'delivered', 'read');

create index if not exists seller_signal_auto_whatsapp_events_user_created_idx
  on public.seller_signal_auto_whatsapp_events (user_id, created_at desc);

create index if not exists seller_signal_auto_whatsapp_events_status_date_idx
  on public.seller_signal_auto_whatsapp_events (status, transaction_date);

alter table public.seller_signal_auto_whatsapp_events enable row level security;

drop policy if exists "Users can read own auto WhatsApp events" on public.seller_signal_auto_whatsapp_events;
create policy "Users can read own auto WhatsApp events"
on public.seller_signal_auto_whatsapp_events
for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.seller_signal_auto_whatsapp_events to authenticated;

drop trigger if exists set_seller_signal_auto_whatsapp_events_updated_at on public.seller_signal_auto_whatsapp_events;
create trigger set_seller_signal_auto_whatsapp_events_updated_at
before update on public.seller_signal_auto_whatsapp_events
for each row
execute function public.handle_updated_at();

do $$
begin
  perform cron.unschedule('seller-signal-auto-whatsapp');
exception
  when others then
    null;
end $$;

select cron.schedule(
  'seller-signal-auto-whatsapp',
  '*/30 * * * *',
  $$
  with auto_secret as (
    select decrypted_secret as token
    from vault.decrypted_secrets
    where name = 'seller_signal_auto_whatsapp_token'
    order by updated_at desc nulls last, created_at desc
    limit 1
  )
  select net.http_post(
    url := 'https://zrqxaammmrydkekbphqa.supabase.co/functions/v1/seller-signal-auto-whatsapp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-auto-whatsapp-token', (select token from auto_secret)
    ),
    body := '{"dryRun":false,"maxSends":5}'::jsonb,
    timeout_milliseconds := 30000
  )
  where exists (select 1 from auto_secret where nullif(token, '') is not null);
  $$
);
