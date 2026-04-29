create table if not exists public.building_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alias_name text not null,
  alias_key text not null,
  canonical_name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.building_aliases
  add column if not exists alias_name text,
  add column if not exists alias_key text,
  add column if not exists canonical_name text,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create unique index if not exists building_aliases_user_alias_key_idx
  on public.building_aliases (user_id, alias_key);

create index if not exists building_aliases_user_id_idx
  on public.building_aliases (user_id);

alter table public.building_aliases enable row level security;

drop policy if exists "Users can read own building aliases" on public.building_aliases;
create policy "Users can read own building aliases"
on public.building_aliases
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own building aliases" on public.building_aliases;
create policy "Users can insert own building aliases"
on public.building_aliases
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own building aliases" on public.building_aliases;
create policy "Users can update own building aliases"
on public.building_aliases
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own building aliases" on public.building_aliases;
create policy "Users can delete own building aliases"
on public.building_aliases
for delete
to authenticated
using (auth.uid() = user_id);

drop trigger if exists set_building_aliases_updated_at on public.building_aliases;
create trigger set_building_aliases_updated_at
before update on public.building_aliases
for each row
execute function public.handle_updated_at();
