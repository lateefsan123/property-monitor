-- Broker outreach is separate from transaction-based seller automation.
create table public.broker_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  sender_phone text not null check (sender_phone ~ '^[1-9][0-9]{7,14}$'),
  status text not null default 'draft' check (status in ('draft','active','paused')),
  intro_template text not null check (length(intro_template) between 1 and 1024),
  followup_template text not null check (length(followup_template) between 1 and 1024),
  demo_url text not null check (demo_url ~ '^https://'),
  followup_days integer not null default 3 check (followup_days between 1 and 30),
  daily_limit integer not null default 40 check (daily_limit between 1 and 40),
  created_at timestamptz not null default now(),
  unique (id,user_id)
);
create table public.broker_campaign_contacts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  agency text not null check (length(agency) between 1 and 200),
  phone text not null check (phone ~ '^[1-9][0-9]{7,14}$'),
  source text not null default '',
  status text not null default 'ready' check (status in ('ready','sending','sent','done','replied','opted_out','excluded','error')),
  step integer not null default 0 check (step between 0 and 2),
  next_send_at timestamptz not null default now(),
  last_message_id uuid references public.whatsapp_messages(id),
  external_contacted_at timestamptz,
  foreign key (campaign_id,user_id) references public.broker_campaigns(id,user_id) on delete cascade,
  unique (campaign_id,phone)
);
create index broker_campaign_due on public.broker_campaign_contacts(campaign_id,next_send_at) where status in ('ready','sent');
alter table public.broker_campaigns enable row level security;
alter table public.broker_campaign_contacts enable row level security;
grant select,insert,update,delete on public.broker_campaigns,public.broker_campaign_contacts to authenticated;
create policy broker_campaign_owner on public.broker_campaigns for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy broker_contact_owner on public.broker_campaign_contacts for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

-- Same user/day advisory lock as seller automation: the 40-send cap is shared.
-- Service-only claim, one message per account/run; unresolved sends never retry.
create function public.claim_broker_campaign_message(p_campaign_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  c public.broker_campaigns;
  r public.broker_campaign_contacts;
  a public.whatsapp_accounts;
  setting public.seller_signal_automation_settings;
  day date := (now() at time zone 'Asia/Dubai')::date;
  hour integer := extract(hour from now() at time zone 'Asia/Dubai');
  count_sent integer;
  message_id uuid;
  text_body text;
begin
  select * into c from public.broker_campaigns where id=p_campaign_id and status='active';
  if not found then return jsonb_build_object('reason','paused'); end if;
  perform pg_advisory_xact_lock(hashtextextended(c.user_id::text||':'||day::text,0));
  select * into c from public.broker_campaigns where id=p_campaign_id and status='active' for update;
  if not found then return jsonb_build_object('reason','paused'); end if;
  select * into a from public.whatsapp_accounts where user_id=c.user_id and provider='baileys'
    and connection_status='connected' and regexp_replace(display_phone_number,'[^0-9]','','g')=c.sender_phone limit 1;
  if not found then return jsonb_build_object('reason','sender_not_connected'); end if;
  select * into setting from public.seller_signal_automation_settings where user_id=c.user_id;
  if hour < coalesce(setting.send_window_start_hour,9) or hour >= coalesce(setting.send_window_end_hour,21) then
    return jsonb_build_object('reason','outside_send_hours'); end if;
  if exists (select 1 from public.whatsapp_messages where user_id=c.user_id and direction='outbound'
      and send_source='auto' and status in ('sending','queued','sent','delivered','read')
      and created_at > now()-make_interval(mins=>coalesce(setting.send_interval_minutes,5))) then
    return jsonb_build_object('reason','spacing'); end if;
  -- All sends known to Repeat count, including manual sends from this account.
  select count(*) into count_sent from public.whatsapp_messages where user_id=c.user_id and direction='outbound'
    and status in ('sending','queued','sent','delivered','read')
    and created_at >= day::timestamp at time zone 'Asia/Dubai'
    and created_at < (day+1)::timestamp at time zone 'Asia/Dubai';
  count_sent := count_sent + (select count(distinct phone) from public.broker_campaign_contacts
    where user_id=c.user_id and external_contacted_at >= day::timestamp at time zone 'Asia/Dubai'
    and external_contacted_at < (day+1)::timestamp at time zone 'Asia/Dubai');
  if count_sent >= least(c.daily_limit,coalesce(setting.daily_message_limit,40),40) then
    return jsonb_build_object('reason','daily_limit'); end if;
  -- Any reply halts the sequence. Opt-outs are classified by the runner.
  update public.broker_campaign_contacts x set status='replied'
    where x.campaign_id=c.id and x.status in ('ready','sent') and exists (
      select 1 from public.whatsapp_messages m where m.user_id=c.user_id and m.account_id=a.id
      and m.direction='inbound' and regexp_replace(m.recipient_phone,'[^0-9]','','g')=x.phone);
  -- Existing conversations (including another campaign) never get another intro.
  update public.broker_campaign_contacts x set status='excluded'
    where x.campaign_id=c.id and x.status='ready' and x.step=0 and exists (
      select 1 from public.whatsapp_messages m where m.user_id=c.user_id and m.direction='outbound'
      and regexp_replace(m.recipient_phone,'[^0-9]','','g')=x.phone
      and m.status in ('queued','sending','sent','delivered','read'));
  select * into r from public.broker_campaign_contacts where campaign_id=c.id
    and status in ('ready','sent') and step<2 and next_send_at<=now()
    order by next_send_at,id limit 1 for update skip locked;
  if not found then return jsonb_build_object('reason','no_due_contacts'); end if;
  text_body := case when r.step=0 then c.intro_template else c.followup_template end;
  text_body := replace(replace(replace(text_body,'{name}',r.name),'{agency}',r.agency),'{demo_url}',c.demo_url);
  if length(text_body)>1024 or text_body ~ '\{[^}]+\}' then raise exception 'Invalid personalised message'; end if;
  insert into public.whatsapp_messages(user_id,account_id,direction,recipient_phone,message_type,body,status,send_source,raw_request)
    values(c.user_id,a.id,'outbound',r.phone,'text',text_body,'sending','auto',jsonb_build_object('broker_campaign_id',c.id,'contact_id',r.id,'step',r.step)) returning id into message_id;
  update public.broker_campaign_contacts set status='sending',last_message_id=message_id where id=r.id;
  return jsonb_build_object('message_id',message_id,'contact_id',r.id,'campaign_id',c.id,'user_id',c.user_id,'account_id',a.id,
    'phone',r.phone,'body',text_body,'step',r.step,'followup_days',c.followup_days);
end $$;
revoke all on function public.claim_broker_campaign_message(uuid) from public,anon,authenticated;
grant execute on function public.claim_broker_campaign_message(uuid) to service_role;
