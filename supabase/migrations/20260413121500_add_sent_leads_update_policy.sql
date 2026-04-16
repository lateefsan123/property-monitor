drop policy if exists "Users can update own sent_leads" on public.sent_leads;

create policy "Users can update own sent_leads"
on public.sent_leads
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
