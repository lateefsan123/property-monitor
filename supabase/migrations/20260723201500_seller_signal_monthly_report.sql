-- Monthly building market report: one recap per lead per month, sent through
-- the shared automatic WhatsApp pipeline. Mirrors the auto-whatsapp events
-- table so the same operational patterns apply.
create table if not exists public.seller_signal_monthly_report_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id integer not null references public.leads(id) on delete cascade,
  account_id uuid references public.whatsapp_accounts(id) on delete set null,
  message_id uuid references public.whatsapp_messages(id) on delete set null,
  report_month date not null,
  status text not null default 'sending' check (status in ('sending', 'sent', 'skipped', 'failed')),
  reason text,
  error_message text,
  run_id uuid,
  attempted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, lead_id, report_month)
);

create index if not exists seller_signal_monthly_report_events_user_created_idx
  on public.seller_signal_monthly_report_events (user_id, created_at desc);

create index if not exists seller_signal_monthly_report_events_month_status_idx
  on public.seller_signal_monthly_report_events (report_month, status);

alter table public.seller_signal_monthly_report_events enable row level security;

drop policy if exists "Users can read own monthly report events" on public.seller_signal_monthly_report_events;
create policy "Users can read own monthly report events"
on public.seller_signal_monthly_report_events
for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.seller_signal_monthly_report_events to authenticated;

drop trigger if exists set_seller_signal_monthly_report_events_updated_at on public.seller_signal_monthly_report_events;
create trigger set_seller_signal_monthly_report_events_updated_at
before update on public.seller_signal_monthly_report_events
for each row
execute function public.handle_updated_at();

-- Drain the monthly queue during the first week of each month. The function
-- itself enforces the Dubai send window, the shared 50/day cap, and the
-- one-report-per-lead-per-month dedupe, so a generous cron cadence is safe.
-- Sends stay off until SELLER_SIGNAL_MONTHLY_REPORT_ENABLED=true is set on the
-- edge function.
do $$
begin
  perform cron.unschedule('seller-signal-monthly-report');
exception
  when others then
    null;
end $$;

select cron.schedule(
  'seller-signal-monthly-report',
  '*/30 * 1-7 * *',
  $$
  with auto_secret as (
    select decrypted_secret as token
    from vault.decrypted_secrets
    where name = 'seller_signal_auto_whatsapp_token'
    order by updated_at desc nulls last, created_at desc
    limit 1
  )
  select net.http_post(
    url := 'https://zrqxaammmrydkekbphqa.supabase.co/functions/v1/seller-signal-monthly-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-monthly-report-token', (select token from auto_secret)
    ),
    body := '{"dryRun":false,"maxSends":5}'::jsonb,
    timeout_milliseconds := 60000
  )
  where exists (select 1 from auto_secret where nullif(token, '') is not null);
  $$
);
