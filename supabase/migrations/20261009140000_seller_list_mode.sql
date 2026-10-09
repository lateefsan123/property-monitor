-- Which seller list the web app uses: 'server' (seller_list_page, one page at
-- a time) or 'client' (the whole list in the browser). A row with no user_id
-- is the default for everyone; a user's own row overrides it. Switching back
-- is one update; the app re-reads this every few minutes.
create table if not exists public.seller_list_modes (
  user_id uuid references auth.users(id) on delete cascade,
  mode text not null check (mode in ('client', 'server')),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists seller_list_modes_user_idx
  on public.seller_list_modes (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.seller_list_modes enable row level security;

drop policy if exists "Read default and own seller list mode" on public.seller_list_modes;
create policy "Read default and own seller list mode" on public.seller_list_modes
  for select to authenticated using (user_id is null or user_id = (select auth.uid()));

revoke insert, update, delete on public.seller_list_modes from anon, authenticated;

insert into public.seller_list_modes (user_id, mode)
select null, 'client'
where not exists (select 1 from public.seller_list_modes where user_id is null);
