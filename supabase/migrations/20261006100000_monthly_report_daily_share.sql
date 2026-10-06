-- Split the 40 automated WhatsApp messages a day between transaction updates
-- and monthly reports. monthly_report_daily_share is how many of the 40 go to
-- monthly reports when both automations are on (default 10, so 30 updates);
-- the rest go to transaction updates. A fill pass (p_fill) lets either kind
-- use slots the other left unused, so the day still reaches 40 at most.

alter table public.seller_signal_automation_settings
  add column if not exists monthly_report_daily_share integer not null default 10;

alter table public.seller_signal_automation_settings
  drop constraint if exists seller_signal_automation_settings_monthly_report_daily_share_check;
alter table public.seller_signal_automation_settings
  add constraint seller_signal_automation_settings_monthly_report_daily_share_check
  check (monthly_report_daily_share between 0 and 40);

-- Replace (not overload) the claim function so existing named-argument calls stay unambiguous.
drop function if exists public.claim_seller_signal_automation_message(
  uuid, uuid, integer, text, text, text, jsonb, date, uuid, integer, text
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
  v_effective_cap integer := greatest(1, least(coalesce(p_daily_cap, 40), 40));
  v_daily_count integer;
  v_kind_count integer;
  v_kind_cap integer;
  v_share integer;
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

  select auto_whatsapp_enabled, monthly_reports_enabled, monthly_report_daily_share
  into v_transaction_updates_enabled, v_monthly_reports_enabled, v_share
  from public.seller_signal_automation_settings
  where user_id = p_user_id;

  select count(*)::integer,
         count(*) filter (
           where (p_automation_kind = 'monthly_reports' and market_transaction_date is null)
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
  ) then
    return query select null::uuid, v_daily_count, false;
    return;
  end if;

  if v_daily_count >= v_effective_cap then
    return query select null::uuid, v_daily_count, false;
    return;
  end if;

  -- The split only applies when both automations are on and this isn't a fill pass.
  if not coalesce(p_fill, false)
    and coalesce(v_transaction_updates_enabled, true)
    and coalesce(v_monthly_reports_enabled, false)
  then
    v_share := greatest(0, least(coalesce(v_share, 10), v_effective_cap));
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
  uuid, uuid, integer, text, text, text, jsonb, date, uuid, integer, text, boolean
) is 'Atomically reserves one Seller Signal automation message against the 40-message Dubai-day quota, split between transaction updates and monthly reports by monthly_report_daily_share unless p_fill.';

revoke all on function public.claim_seller_signal_automation_message(
  uuid, uuid, integer, text, text, text, jsonb, date, uuid, integer, text, boolean
) from public, anon, authenticated;

grant execute on function public.claim_seller_signal_automation_message(
  uuid, uuid, integer, text, text, text, jsonb, date, uuid, integer, text, boolean
) to service_role;
