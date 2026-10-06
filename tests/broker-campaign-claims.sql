-- Runs only synthetic QA rows and rolls everything back. Never calls a provider.
begin;
insert into public.broker_campaigns(user_id,name,sender_phone,status,intro_template,followup_template,demo_url)
values ('90dec869-75fa-4294-8bf1-7e4c2384184f','QA broker claim rollback','35300000000','active','Hi {name} at {agency}: {demo_url}','Follow up {name}','https://repeatai.org');
do $$ declare c uuid; a uuid; j jsonb; n integer; begin
  select id into c from public.broker_campaigns where name='QA broker claim rollback';
  j:=public.claim_broker_campaign_message(c);
  if j->>'reason'<>'sender_not_connected' then raise exception 'Disconnected sender not blocked'; end if;
  insert into public.whatsapp_accounts(user_id,provider,phone_number_id,display_phone_number,connection_status)
  values('90dec869-75fa-4294-8bf1-7e4c2384184f','baileys','baileys:qa-rollback','+35300000000','connected') returning id into a;
  update public.seller_signal_automation_settings set send_window_start_hour=0,send_window_end_hour=24,send_interval_minutes=5,daily_message_limit=40
  where user_id='90dec869-75fa-4294-8bf1-7e4c2384184f';
  insert into public.broker_campaign_contacts(campaign_id,user_id,name,agency,phone)
  values(c,'90dec869-75fa-4294-8bf1-7e4c2384184f','QA replied','QA','971500000001'),
        (c,'90dec869-75fa-4294-8bf1-7e4c2384184f','QA prior','QA','971500000002'),
        (c,'90dec869-75fa-4294-8bf1-7e4c2384184f','QA fresh','QA','971500000003');
  insert into public.whatsapp_messages(user_id,account_id,direction,recipient_phone,message_type,body,status,send_source,created_at)
  values('90dec869-75fa-4294-8bf1-7e4c2384184f',a,'inbound','971500000001','text','stop','received','manual',now()-interval '1 day'),
        ('90dec869-75fa-4294-8bf1-7e4c2384184f',a,'outbound','971500000002','text','prior','sent','manual',now()-interval '1 day');
  j:=public.claim_broker_campaign_message(c);
  if j->>'phone'<>'971500000003' or j->>'body'<>'Hi QA fresh at QA: https://repeatai.org' then raise exception 'Personalisation or suppression failed: %',j; end if;
  select count(*) into n from public.broker_campaign_contacts where campaign_id=c and status in ('replied','excluded');
  if n<>2 then raise exception 'History suppression failed'; end if;
  j:=public.claim_broker_campaign_message(c);
  if j->>'reason'<>'spacing' then raise exception 'Repeated claims were not paced'; end if;
  update public.whatsapp_messages set created_at=now()-interval '10 minutes' where raw_request->>'broker_campaign_id'=c::text;
  update public.broker_campaign_contacts set status='ready' where name='QA fresh' and campaign_id=c;
  update public.broker_campaigns set daily_limit=1 where id=c;
  j:=public.claim_broker_campaign_message(c);
  if j->>'reason'<>'daily_limit' then raise exception 'Shared cap not enforced: %',j; end if;
end $$;
rollback;

-- The isolated demo user cannot read or change the real account's campaign.
begin;
set local role authenticated;
set local request.jwt.claim.sub='90dec869-75fa-4294-8bf1-7e4c2384184f';
do $$ begin
  if exists(select 1 from public.broker_campaigns where id='c7a0bcf7-7997-4ecb-ad1e-c4ba07ef8f21') then
    raise exception 'Cross-account campaign visible';
  end if;
  if exists(select 1 from public.broker_campaign_contacts where campaign_id='c7a0bcf7-7997-4ecb-ad1e-c4ba07ef8f21') then
    raise exception 'Cross-account contacts visible';
  end if;
  if has_function_privilege('authenticated','public.claim_broker_campaign_message(uuid)','EXECUTE')
    or has_function_privilege('anon','public.claim_broker_campaign_message(uuid)','EXECUTE') then
    raise exception 'Claim must remain service-only';
  end if;
end $$;
rollback;
