-- Broker outreach in the existing app: run against the dedicated Repeat AI
-- outreach account (the one linked to the Repeat AI WhatsApp number), never a
-- broker's seller account. scripts/setup-broker-outreach.mjs fills in
-- :outreach_user_id after its safety checks. Safe to re-run: nothing is
-- duplicated. It only prepares data; status follow-ups stay OFF until switched
-- on in Settings > Automations.
--
-- Source of truth: the reconciled draft campaign c7a0bcf7 (6 Oct 2026).
--   ready (6)                     -> Broker – intro      (intro, then follow-up after 3 days)
--   excluded, contacted (33)      -> Broker – follow-up  (one follow-up 3 days after 6 Oct)
--   excluded, contacted: Oliver   -> Broker – done       (already had the video and setup help)
--   replied: Albert               -> Broker – onboarding (never auto-messaged)
--   error: Alex (send unverified) -> Broker – review     (never auto-messaged until checked)
--   excluded, never contacted     -> not imported (no WhatsApp found)

begin;

-- Statuses (exact names; 0 days = never auto-messaged).
insert into public.seller_signal_statuses (user_id, label, color, follow_up_days, position)
values
  (':outreach_user_id', 'Broker – intro', '#3b82f6', 3, 0),
  (':outreach_user_id', 'Broker – follow-up', '#8b5cf6', 3, 1),
  (':outreach_user_id', 'Broker – done', '#6b7280', 0, 2),
  (':outreach_user_id', 'Broker – onboarding', '#22a06b', 0, 3),
  (':outreach_user_id', 'Broker – review', '#c99400', 0, 4)
on conflict (user_id, lower(btrim(label))) do nothing;

update public.seller_signal_statuses s
set next_status_id = n.id
from public.seller_signal_statuses n
where s.user_id = ':outreach_user_id' and n.user_id = s.user_id
  and ((s.label = 'Broker – intro' and n.label = 'Broker – follow-up')
    or (s.label = 'Broker – follow-up' and n.label = 'Broker – done'));

-- Templates, assigned to the intro and follow-up statuses. {{building}} is the agency.
insert into public.seller_signal_message_templates (user_id, name, content, is_default, statuses)
select ':outreach_user_id', 'Broker intro',
  E'Hi {{name}}, Lateef here from Repeat AI.\n\nRepeat AI follows up with your sellers on WhatsApp, with personalised messages and the latest sales in their building, so none of them go cold.\n\nHere''s a one-minute demo: https://zrqxaammmrydkekbphqa.supabase.co/storage/v1/object/public/broker-demo-videos/launch-film-v5-2026-10-05.mp4\n\nHappy to help you get set up at {{building}}. If it''s not for you, just let me know.',
  false, array['custom:' || s.id]
from public.seller_signal_statuses s
where s.user_id = ':outreach_user_id' and s.label = 'Broker – intro'
  and not exists (select 1 from public.seller_signal_message_templates t where t.user_id = ':outreach_user_id' and t.name = 'Broker intro');

insert into public.seller_signal_message_templates (user_id, name, content, is_default, statuses)
select ':outreach_user_id', 'Broker follow-up',
  E'Hi {{name}}, just following up on Repeat AI. Would it help to see how it keeps you in touch with your sellers at {{building}}? Happy to walk you through it or get you set up.\n\nIf you''d rather not hear from me, just let me know and I''ll leave it there.',
  false, array['custom:' || s.id]
from public.seller_signal_statuses s
where s.user_id = ':outreach_user_id' and s.label = 'Broker – follow-up'
  and not exists (select 1 from public.seller_signal_message_templates t where t.user_id = ':outreach_user_id' and t.name = 'Broker follow-up');

-- The brokers, as their own spreadsheet.
insert into public.lead_sources (user_id, label, type)
select ':outreach_user_id', 'Brokers – 6 Oct 2026', 'building'
where not exists (select 1 from public.lead_sources where user_id = ':outreach_user_id' and label = 'Brokers – 6 Oct 2026');

insert into public.leads (user_id, source_id, name, building, phone, status, last_contact, notes)
select ':outreach_user_id', src.id, c.name, c.agency, c.phone,
  case
    when c.status = 'ready' then 'Broker – intro'
    when c.status = 'replied' then 'Broker – onboarding'
    when c.status = 'error' then 'Broker – review'
    when c.name = 'Oliver Leedham' then 'Broker – done'
    else 'Broker – follow-up'
  end,
  (c.external_contacted_at at time zone 'Asia/Dubai')::date,
  concat_ws(E'\n', 'Agency: ' || c.agency, nullif(c.source, ''),
    case c.status when 'replied' then 'Replied: plans to use it. Help with onboarding, no generic follow-up.'
                  when 'error' then 'Earlier send unverified: check WhatsApp before messaging.' end)
from public.broker_campaign_contacts c
cross join lateral (select id from public.lead_sources where user_id = ':outreach_user_id' and label = 'Brokers – 6 Oct 2026' limit 1) src
where c.campaign_id = 'c7a0bcf7-7997-4ecb-ad1e-c4ba07ef8f21'
  and (c.status in ('ready', 'replied', 'error') or (c.status = 'excluded' and c.external_contacted_at is not null))
  and not exists (select 1 from public.leads l where l.user_id = ':outreach_user_id' and l.phone = c.phone);

-- Outreach pacing: no transaction updates or reports to brokers; follow-ups
-- stay off until activated; gentle pacing for cold introductions.
insert into public.seller_signal_automation_settings
  (user_id, auto_whatsapp_enabled, monthly_reports_enabled, status_followups_enabled,
   send_window_start_hour, send_window_end_hour, send_interval_minutes, daily_message_limit)
values (':outreach_user_id', false, false, false, 10, 18, 10, 20)
on conflict (user_id) do update set
  auto_whatsapp_enabled = false,
  monthly_reports_enabled = false;

commit;

select status, count(*) from public.leads where user_id = ':outreach_user_id' group by status order by status;
