alter table public.seller_signal_automation_settings
  add column if not exists monthly_reports_enabled boolean not null default false;

update public.seller_signal_automation_settings
set monthly_reports_enabled = false
where user_id in (
  select id
  from auth.users
  where lower(email) = 'lateefsanusi682@gmail.com'
);

create or replace function public.claim_seller_signal_automation_message(
  p_user_id uuid,
  p_account_id uuid,
  p_lead_id integer,
  p_recipient_phone text,
  p_message_type text,
  p_body text,
  p_raw_request jsonb,
  p_market_transaction_date date,
  p_auto_send_event_id uuid,
  p_daily_cap integer default 40,
  p_automation_kind text default 'transaction_updates'
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
  v_transaction_updates_enabled boolean;
  v_monthly_reports_enabled boolean;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Only the service role can claim automatic WhatsApp sends.'
      using errcode = '42501';
  end if;

  if p_automation_kind not in ('transaction_updates', 'monthly_reports') then
    raise exception 'Unsupported automation kind: %', p_automation_kind
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || ':' || v_dubai_date::text, 0)
  );

  select auto_whatsapp_enabled, monthly_reports_enabled
  into v_transaction_updates_enabled, v_monthly_reports_enabled
  from public.seller_signal_automation_settings
  where user_id = p_user_id;

  select count(*)::integer
  into v_daily_count
  from public.whatsapp_messages
  where user_id = p_user_id
    and direction = 'outbound'
    and send_source = 'auto'
    and status in ('queued', 'sending', 'sent', 'delivered', 'read')
    and created_at >= v_day_start
    and created_at < v_day_end;

  if (
    p_automation_kind = 'transaction_updates'
    and coalesce(v_transaction_updates_enabled, true) = false
  ) or (
    p_automation_kind = 'monthly_reports'
    and coalesce(v_monthly_reports_enabled, false) = false
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

comment on function public.claim_seller_signal_automation_message(
  uuid, uuid, integer, text, text, text, jsonb, date, uuid, integer, text
) is 'Atomically reserves one enabled Seller Signal automation message against the shared 40-message Dubai-day quota.';

revoke all on function public.claim_seller_signal_automation_message(
  uuid, uuid, integer, text, text, text, jsonb, date, uuid, integer, text
) from public, anon, authenticated;

grant execute on function public.claim_seller_signal_automation_message(
  uuid, uuid, integer, text, text, text, jsonb, date, uuid, integer, text
) to service_role;

do $$
declare
  matching_job record;
begin
  for matching_job in
    select jobid
    from cron.job
    where jobname in ('seller-signal-auto-whatsapp', 'seller-signal-monthly-report')
      or command ilike '%seller-signal-auto-whatsapp%'
      or command ilike '%seller-signal-monthly-report%'
      or command ilike '%seller-signal-automation-dispatcher%'
  loop
    perform cron.unschedule(matching_job.jobid);
  end loop;
end;
$$;

select cron.schedule(
  'seller-signal-automation-dispatcher',
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
    url := 'https://zrqxaammmrydkekbphqa.supabase.co/functions/v1/seller-signal-automation-dispatcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-auto-whatsapp-token', (select token from auto_secret)
    ),
    body := '{"dryRun":false,"maxSends":1,"dailyCap":40}'::jsonb,
    timeout_milliseconds := 120000
  )
  where exists (select 1 from auto_secret where nullif(token, '') is not null);
  $command$
);
