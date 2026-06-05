create index if not exists leads_user_sent_id_idx
  on public.leads (user_id, sent_at, id);

create index if not exists leads_user_source_sent_id_idx
  on public.leads (user_id, source_id, sent_at, id);

create index if not exists leads_user_status_sent_id_idx
  on public.leads (user_id, status, sent_at, id);
