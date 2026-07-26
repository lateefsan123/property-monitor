create table if not exists public.seller_signal_automation_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  auto_whatsapp_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_seller_signal_automation_settings_updated_at
  on public.seller_signal_automation_settings;
create trigger set_seller_signal_automation_settings_updated_at
before update on public.seller_signal_automation_settings
for each row execute function public.handle_updated_at();

alter table public.seller_signal_automation_settings enable row level security;

drop policy if exists seller_signal_automation_settings_select_own
  on public.seller_signal_automation_settings;
create policy seller_signal_automation_settings_select_own
on public.seller_signal_automation_settings
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists seller_signal_automation_settings_insert_own
  on public.seller_signal_automation_settings;
create policy seller_signal_automation_settings_insert_own
on public.seller_signal_automation_settings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists seller_signal_automation_settings_update_own
  on public.seller_signal_automation_settings;
create policy seller_signal_automation_settings_update_own
on public.seller_signal_automation_settings
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.seller_signal_automation_settings from public, anon, authenticated;
grant select, insert, update on table public.seller_signal_automation_settings to authenticated;
grant all on table public.seller_signal_automation_settings to service_role;

insert into public.seller_signal_automation_settings (user_id, auto_whatsapp_enabled)
select id, false
from auth.users
where lower(email) = 'lateefsanusi682@gmail.com'
on conflict (user_id) do update
set auto_whatsapp_enabled = excluded.auto_whatsapp_enabled;

create or replace function public.claim_seller_signal_auto_whatsapp_message(
  p_user_id uuid,
  p_account_id uuid,
  p_lead_id integer,
  p_recipient_phone text,
  p_message_type text,
  p_body text,
  p_raw_request jsonb,
  p_market_transaction_date date,
  p_auto_send_event_id uuid,
  p_daily_cap integer default 40
)
returns table (
  message_id uuid,
  daily_count integer,
  claimed boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dubai_date date := (now() at time zone 'Asia/Dubai')::date;
  v_day_start timestamptz := v_dubai_date::timestamp at time zone 'Asia/Dubai';
  v_day_end timestamptz := (v_dubai_date + 1)::timestamp at time zone 'Asia/Dubai';
  v_effective_cap integer := greatest(1, least(coalesce(p_daily_cap, 40), 40));
  v_daily_count integer;
  v_message_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the service role can claim automatic WhatsApp sends.'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || ':' || v_dubai_date::text, 0)
  );

  select count(*)::integer
  into v_daily_count
  from public.whatsapp_messages
  where user_id = p_user_id
    and direction = 'outbound'
    and send_source = 'auto'
    and status in ('queued', 'sending', 'sent', 'delivered', 'read')
    and created_at >= v_day_start
    and created_at < v_day_end;

  if exists (
    select 1
    from public.seller_signal_automation_settings
    where user_id = p_user_id
      and auto_whatsapp_enabled = false
  ) then
    return query select null::uuid, v_daily_count, false;
    return;
  end if;

  if v_daily_count >= v_effective_cap then
    return query select null::uuid, v_daily_count, false;
    return;
  end if;

  insert into public.whatsapp_messages (
    user_id,
    account_id,
    lead_id,
    direction,
    recipient_phone,
    message_type,
    template_name,
    template_language,
    template_parameters,
    body,
    status,
    raw_request,
    send_source,
    market_transaction_date,
    auto_send_event_id
  )
  values (
    p_user_id,
    p_account_id,
    p_lead_id,
    'outbound',
    p_recipient_phone,
    p_message_type,
    null,
    'en_US',
    '[]'::jsonb,
    p_body,
    'sending',
    coalesce(p_raw_request, '{}'::jsonb),
    'auto',
    p_market_transaction_date,
    p_auto_send_event_id
  )
  returning id into v_message_id;

  return query select v_message_id, v_daily_count + 1, true;
end;
$$;

comment on function public.claim_seller_signal_auto_whatsapp_message(
  uuid, uuid, integer, text, text, text, jsonb, date, uuid, integer
) is 'Atomically reserves an enabled automatic WhatsApp message while enforcing a maximum of 40 active sends per user per Dubai day.';

revoke all on function public.claim_seller_signal_auto_whatsapp_message(
  uuid, uuid, integer, text, text, text, jsonb, date, uuid, integer
) from public, anon, authenticated;

grant execute on function public.claim_seller_signal_auto_whatsapp_message(
  uuid, uuid, integer, text, text, text, jsonb, date, uuid, integer
) to service_role;

do $$
declare
  matching_job record;
begin
  for matching_job in
    select jobid
    from cron.job
    where jobname = 'seller-signal-auto-whatsapp'
      or command ilike '%seller-signal-auto-whatsapp%'
  loop
    perform cron.unschedule(matching_job.jobid);
  end loop;
end;
$$;

select cron.schedule(
  'seller-signal-auto-whatsapp',
  '*/5 * * * *',
  $command$
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
    body := '{"dryRun":false,"maxSends":1,"dailyCap":40}'::jsonb,
    timeout_milliseconds := 30000
  )
  where exists (select 1 from auto_secret where nullif(token, '') is not null);
  $command$
);
