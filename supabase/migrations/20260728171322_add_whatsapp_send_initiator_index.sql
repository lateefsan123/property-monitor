create index if not exists whatsapp_messages_initiated_by_idx
  on public.whatsapp_messages (initiated_by)
  where initiated_by is not null;
