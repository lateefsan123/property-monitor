alter table public.leads add column if not exists next_follow_up_on date;
comment on column public.leads.next_follow_up_on is 'One-off follow-up date in Dubai time; cleared after a successful seller message.';
