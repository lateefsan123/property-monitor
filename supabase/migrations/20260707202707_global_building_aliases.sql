alter table public.building_aliases
  add column if not exists is_global boolean not null default false;

alter table public.building_aliases
  alter column user_id drop not null;

create unique index if not exists building_aliases_global_alias_key_idx
  on public.building_aliases (alias_key)
  where is_global = true;

create unique index if not exists building_aliases_user_alias_key_local_idx
  on public.building_aliases (user_id, alias_key)
  where is_global = false;

create index if not exists building_aliases_global_idx
  on public.building_aliases (is_global, alias_key);

alter table public.building_aliases
  drop constraint if exists building_aliases_scope_check;

alter table public.building_aliases
  add constraint building_aliases_scope_check
  check (
    (is_global = true and user_id is null)
    or
    (is_global = false and user_id is not null)
  );

drop policy if exists "Users can read own building aliases" on public.building_aliases;
create policy "Users can read own or global building aliases"
on public.building_aliases
for select
to authenticated
using (is_global = true or auth.uid() = user_id);

drop policy if exists "Users can insert own building aliases" on public.building_aliases;
create policy "Users can insert own building aliases"
on public.building_aliases
for insert
to authenticated
with check (is_global = false and auth.uid() = user_id);

drop policy if exists "Users can update own building aliases" on public.building_aliases;
create policy "Users can update own building aliases"
on public.building_aliases
for update
to authenticated
using (is_global = false and auth.uid() = user_id)
with check (is_global = false and auth.uid() = user_id);

drop policy if exists "Users can delete own building aliases" on public.building_aliases;
create policy "Users can delete own building aliases"
on public.building_aliases
for delete
to authenticated
using (is_global = false and auth.uid() = user_id);
