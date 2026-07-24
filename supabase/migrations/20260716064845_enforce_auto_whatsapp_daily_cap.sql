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

  -- Serialize claims for the same user and Dubai date so overlapping function
  -- invocations cannot reserve message 41 at the same time.
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
) is 'Atomically reserves an automatic WhatsApp message while enforcing a maximum of 40 active sends per user per Dubai day.';

revoke all on function public.claim_seller_signal_auto_whatsapp_message(
  uuid, uuid, integer, text, text, text, jsonb, date, uuid, integer
) from public, anon, authenticated;

grant execute on function public.claim_seller_signal_auto_whatsapp_message(
  uuid, uuid, integer, text, text, text, jsonb, date, uuid, integer
) to service_role;
