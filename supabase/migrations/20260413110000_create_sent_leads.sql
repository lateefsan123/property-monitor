create table if not exists public.sent_leads (
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  sent_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, lead_id)
);

alter table public.sent_leads enable row level security;

create policy "Users can read own sent_leads"
on public.sent_leads
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own sent_leads"
on public.sent_leads
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete own sent_leads"
on public.sent_leads
for delete
to authenticated
using (auth.uid() = user_id);
