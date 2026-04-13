alter table public.leads
  add column if not exists sent_at timestamptz;

create index if not exists leads_user_sent_at_idx on public.leads (user_id, sent_at);

update public.leads as leads
set sent_at = sent_rows.sent_at
from (
  select user_id, lead_id, max(sent_at) as sent_at
  from public.sent_leads
  group by user_id, lead_id
) as sent_rows
where leads.id = sent_rows.lead_id
  and leads.user_id = sent_rows.user_id
  and (leads.sent_at is null or leads.sent_at < sent_rows.sent_at);
