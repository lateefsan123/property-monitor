create table if not exists public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  type text not null check (type in ('personal', 'building')),
  building_name text,
  sheet_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.lead_sources enable row level security;

drop policy if exists "Users can read own lead sources" on public.lead_sources;
create policy "Users can read own lead sources"
on public.lead_sources
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own lead sources" on public.lead_sources;
create policy "Users can insert own lead sources"
on public.lead_sources
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own lead sources" on public.lead_sources;
create policy "Users can update own lead sources"
on public.lead_sources
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own lead sources" on public.lead_sources;
create policy "Users can delete own lead sources"
on public.lead_sources
for delete
to authenticated
using (auth.uid() = user_id);

drop trigger if exists set_lead_sources_updated_at on public.lead_sources;
create trigger set_lead_sources_updated_at
before update on public.lead_sources
for each row
execute function public.handle_updated_at();

alter table public.leads
  add column if not exists source_id uuid references public.lead_sources(id) on delete set null;

create index if not exists leads_source_id_idx on public.leads (source_id);
