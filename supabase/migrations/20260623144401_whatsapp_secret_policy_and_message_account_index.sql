drop policy if exists "No user access to WhatsApp account secrets" on public.whatsapp_account_secrets;
create policy "No user access to WhatsApp account secrets"
on public.whatsapp_account_secrets
for all
to anon, authenticated
using (false)
with check (false);

create index if not exists whatsapp_messages_account_created_idx
  on public.whatsapp_messages (account_id, created_at desc);
