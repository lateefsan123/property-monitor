-- Accounts can raise automated WhatsApps to 45 a day; 40 stays the default.
-- The per-account limit allows 1-45, the claim caps at the account's own
-- limit (40 when not set) and never above 45, and the dispatcher passes 45 as
-- the ceiling instead of 40.

alter table public.seller_signal_automation_settings
  drop constraint if exists seller_signal_automation_settings_daily_message_limit_check;
alter table public.seller_signal_automation_settings
  add constraint seller_signal_automation_settings_daily_message_limit_check
  check (daily_message_limit between 1 and 45);

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
  p_automation_kind text default 'transaction_updates',
  p_fill boolean default false
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
  v_effective_cap integer;
  v_limit integer;
  v_daily_count integer;
  v_kind_count integer;
  v_kind_cap integer;
  v_share integer;
  v_message_id uuid;
  v_transaction_updates_enabled boolean;
  v_monthly_reports_enabled boolean;
  v_status_followups_enabled boolean;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Only the service role can claim automatic WhatsApp sends.'
      using errcode = '42501';
  end if;

  if p_automation_kind not in ('transaction_updates', 'monthly_reports', 'status_followups') then
    raise exception 'Unsupported automation kind: %', p_automation_kind
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || ':' || v_dubai_date::text, 0)
  );

  select auto_whatsapp_enabled, monthly_reports_enabled, monthly_report_daily_share, daily_message_limit, status_followups_enabled
  into v_transaction_updates_enabled, v_monthly_reports_enabled, v_share, v_limit, v_status_followups_enabled
  from public.seller_signal_automation_settings
  where user_id = p_user_id;

  -- The account's own daily limit: 40 unless it raised it, never above 45.
  v_effective_cap := greatest(1, least(coalesce(p_daily_cap, 45), coalesce(v_limit, 40), 45));

  select count(*)::integer,
         count(*) filter (
           where (p_automation_kind = 'monthly_reports'
                  and (automation_kind = 'monthly_reports' or (automation_kind is null and market_transaction_date is null)))
              or (p_automation_kind = 'transaction_updates' and market_transaction_date is not null)
         )::integer
  into v_daily_count, v_kind_count
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
  ) or (
    p_automation_kind = 'status_followups'
    and coalesce(v_status_followups_enabled, false) = false
  ) then
    return query select null::uuid, v_daily_count, false;
    return;
  end if;

  if v_daily_count >= v_effective_cap then
    return query select null::uuid, v_daily_count, false;
    return;
  end if;

  -- The split only applies to updates and reports when both are on and this
  -- isn't a fill pass; status follow-ups only count toward the daily limit.
  if p_automation_kind <> 'status_followups'
    and not coalesce(p_fill, false)
    and coalesce(v_transaction_updates_enabled, true)
    and coalesce(v_monthly_reports_enabled, false)
  then
    -- The split is chosen out of 40; scale it to the account's own limit.
    v_share := greatest(0, least(v_effective_cap, round(coalesce(v_share, 10) * v_effective_cap / 40.0)::integer));
    v_kind_cap := case when p_automation_kind = 'monthly_reports' then v_share else v_effective_cap - v_share end;
    if v_kind_count >= v_kind_cap then
      return query select null::uuid, v_daily_count, false;
      return;
    end if;
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
    auto_send_event_id,
    automation_kind
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
    p_auto_send_event_id,
    p_automation_kind
  )
  returning id into v_message_id;

  return query select v_message_id, v_daily_count + 1, true;
end;
$$;

comment on function public.claim_seller_signal_automation_message(
  uuid, uuid, integer, text, text, text, jsonb, date, uuid, integer, text, boolean
) is 'Atomically reserves one Seller Signal automation message against the account''s daily limit (1-45, 40 by default, Dubai day), split between transaction updates and monthly reports by monthly_report_daily_share unless p_fill; status follow-ups count toward the limit only.';

revoke all on function public.claim_seller_signal_automation_message(
  uuid, uuid, integer, text, text, text, jsonb, date, uuid, integer, text, boolean
) from public, anon, authenticated;

grant execute on function public.claim_seller_signal_automation_message(
  uuid, uuid, integer, text, text, text, jsonb, date, uuid, integer, text, boolean
) to service_role;

-- Same job and command as before, with a ceiling of 45.
do $$
declare
  matching_job record;
begin
  for matching_job in
    select jobid from cron.job where command ilike '%seller-signal-automation-dispatcher%'
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
    body := '{"dryRun":false,"maxSends":1,"dailyCap":45}'::jsonb,
    timeout_milliseconds := 120000
  )
  where exists (select 1 from auto_secret where nullif(token, '') is not null);
  $command$
);
