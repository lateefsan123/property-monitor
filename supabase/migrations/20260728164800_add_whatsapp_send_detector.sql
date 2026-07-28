alter table public.whatsapp_messages
  add column if not exists request_id uuid not null default gen_random_uuid(),
  add column if not exists client_request_id uuid,
  add column if not exists initiated_by uuid references auth.users(id) on delete set null,
  add column if not exists initiated_via text not null default 'unknown';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'whatsapp_messages_initiated_via_check'
      and conrelid = 'public.whatsapp_messages'::regclass
  ) then
    alter table public.whatsapp_messages
      add constraint whatsapp_messages_initiated_via_check
      check (initiated_via in ('web', 'desktop', 'api', 'mcp', 'automation', 'unknown'));
  end if;
end;
$$;

create unique index if not exists whatsapp_messages_request_id_idx
  on public.whatsapp_messages (request_id);

create unique index if not exists whatsapp_messages_user_client_request_idx
  on public.whatsapp_messages (user_id, client_request_id)
  where client_request_id is not null;

create index if not exists whatsapp_messages_user_outbound_sent_idx
  on public.whatsapp_messages (user_id, sent_at desc)
  where direction = 'outbound';

update public.whatsapp_messages
set initiated_via = case send_source
  when 'auto' then 'automation'
  when 'mcp' then 'mcp'
  else initiated_via
end
where initiated_via = 'unknown'
  and send_source in ('auto', 'mcp');

create table if not exists public.seller_signal_send_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dubai_date date not null,
  alert_type text not null check (alert_type in ('daily_volume', 'rapid_repeat')),
  severity text not null check (severity in ('warning', 'high', 'critical')),
  threshold_count integer not null check (threshold_count > 0),
  observed_count integer not null check (observed_count > 0),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  acknowledged_at timestamptz,
  unique (user_id, dubai_date, alert_type, threshold_count)
);

create index if not exists seller_signal_send_alerts_user_date_idx
  on public.seller_signal_send_alerts (user_id, dubai_date desc, created_at desc);

alter table public.seller_signal_send_alerts enable row level security;

drop policy if exists "Users can read own send alerts" on public.seller_signal_send_alerts;
create policy "Users can read own send alerts"
on public.seller_signal_send_alerts
for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.seller_signal_send_alerts to authenticated;
revoke insert, update, delete on public.seller_signal_send_alerts from anon, authenticated;

create or replace function public.normalize_whatsapp_send_provenance()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.initiated_via = 'unknown' then
    new.initiated_via := case new.send_source
      when 'auto' then 'automation'
      when 'mcp' then 'mcp'
      else 'unknown'
    end;
  end if;
  return new;
end;
$$;

revoke all on function public.normalize_whatsapp_send_provenance() from public, anon, authenticated;

drop trigger if exists normalize_whatsapp_send_provenance on public.whatsapp_messages;
create trigger normalize_whatsapp_send_provenance
before insert on public.whatsapp_messages
for each row
execute function public.normalize_whatsapp_send_provenance();

create or replace function public.detect_whatsapp_send_anomaly()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  message_time timestamptz;
  day_start timestamptz;
  day_end timestamptz;
  dubai_day date;
  daily_count integer;
  repeat_count integer;
  threshold_value integer;
begin
  if new.direction <> 'outbound'
    or new.status not in ('sent', 'delivered', 'read')
    or old.status in ('sent', 'delivered', 'read') then
    return new;
  end if;

  message_time := coalesce(new.sent_at, new.created_at, timezone('utc', now()));
  dubai_day := (message_time at time zone 'Asia/Dubai')::date;
  day_start := dubai_day::timestamp at time zone 'Asia/Dubai';
  day_end := (dubai_day + 1)::timestamp at time zone 'Asia/Dubai';

  select count(*)
  into daily_count
  from public.whatsapp_messages
  where user_id = new.user_id
    and direction = 'outbound'
    and status in ('sent', 'delivered', 'read')
    and coalesce(sent_at, created_at) >= day_start
    and coalesce(sent_at, created_at) < day_end;

  foreach threshold_value in array array[40, 60, 80]
  loop
    if daily_count >= threshold_value then
      insert into public.seller_signal_send_alerts (
        user_id,
        dubai_date,
        alert_type,
        severity,
        threshold_count,
        observed_count,
        details
      )
      values (
        new.user_id,
        dubai_day,
        'daily_volume',
        case
          when threshold_value >= 80 then 'critical'
          when threshold_value >= 60 then 'high'
          else 'warning'
        end,
        threshold_value,
        daily_count,
        jsonb_build_object(
          'messageId', new.id,
          'sendSource', new.send_source,
          'initiatedVia', new.initiated_via
        )
      )
      on conflict (user_id, dubai_date, alert_type, threshold_count)
      do update set
        observed_count = greatest(
          public.seller_signal_send_alerts.observed_count,
          excluded.observed_count
        );
    end if;
  end loop;

  select count(*)
  into repeat_count
  from public.whatsapp_messages
  where user_id = new.user_id
    and id <> new.id
    and direction = 'outbound'
    and status in ('sending', 'sent', 'delivered', 'read')
    and recipient_phone = new.recipient_phone
    and coalesce(sent_at, created_at) >= message_time - interval '60 seconds'
    and coalesce(sent_at, created_at) <= message_time;

  if repeat_count > 0 then
    insert into public.seller_signal_send_alerts (
      user_id,
      dubai_date,
      alert_type,
      severity,
      threshold_count,
      observed_count,
      details
    )
    values (
      new.user_id,
      dubai_day,
      'rapid_repeat',
      'high',
      2,
      repeat_count + 1,
      jsonb_build_object(
        'messageId', new.id,
        'sendSource', new.send_source,
        'initiatedVia', new.initiated_via,
        'windowSeconds', 60
      )
    )
    on conflict (user_id, dubai_date, alert_type, threshold_count)
    do update set
      observed_count = greatest(
        public.seller_signal_send_alerts.observed_count,
        excluded.observed_count
      ),
      details = excluded.details;
  end if;

  return new;
end;
$$;

revoke all on function public.detect_whatsapp_send_anomaly() from public, anon, authenticated;

drop trigger if exists detect_whatsapp_send_anomaly on public.whatsapp_messages;
create trigger detect_whatsapp_send_anomaly
after update of status on public.whatsapp_messages
for each row
execute function public.detect_whatsapp_send_anomaly();

with current_day_counts as (
  select
    user_id,
    (now() at time zone 'Asia/Dubai')::date as dubai_date,
    count(*)::integer as observed_count
  from public.whatsapp_messages
  where direction = 'outbound'
    and status in ('sent', 'delivered', 'read')
    and coalesce(sent_at, created_at) >= (
      (now() at time zone 'Asia/Dubai')::date::timestamp at time zone 'Asia/Dubai'
    )
    and coalesce(sent_at, created_at) < (
      ((now() at time zone 'Asia/Dubai')::date + 1)::timestamp at time zone 'Asia/Dubai'
    )
  group by user_id
),
thresholds as (
  select *
  from (values
    (40, 'warning'),
    (60, 'high'),
    (80, 'critical')
  ) as configured(threshold_count, severity)
)
insert into public.seller_signal_send_alerts (
  user_id,
  dubai_date,
  alert_type,
  severity,
  threshold_count,
  observed_count,
  details
)
select
  counts.user_id,
  counts.dubai_date,
  'daily_volume',
  thresholds.severity,
  thresholds.threshold_count,
  counts.observed_count,
  jsonb_build_object('backfilled', true)
from current_day_counts counts
cross join thresholds
where counts.observed_count >= thresholds.threshold_count
on conflict (user_id, dubai_date, alert_type, threshold_count)
do update set observed_count = greatest(
  public.seller_signal_send_alerts.observed_count,
  excluded.observed_count
);
