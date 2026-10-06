-- Custom seller statuses. Each account can add its own statuses (label,
-- colour, follow-up gap) and change the follow-up gap of the built-in ones.
-- follow_up_days: days between follow-ups; 0 means "don't follow up", which
-- automations treat like Not Interested. builtin_key marks an override row for
-- one of the four built-in statuses rather than a new status.

create table if not exists public.seller_signal_statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  color text,
  follow_up_days integer not null default 30,
  builtin_key text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_signal_statuses_label_length check (char_length(btrim(label)) between 1 and 40),
  constraint seller_signal_statuses_follow_up_days check (follow_up_days between 0 and 365),
  constraint seller_signal_statuses_color check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint seller_signal_statuses_builtin_key check (
    builtin_key is null or builtin_key in ('not_interested', 'prospect', 'market_appraisal', 'for_sale_available')
  )
);

create unique index if not exists seller_signal_statuses_user_label
  on public.seller_signal_statuses (user_id, lower(btrim(label)));
create unique index if not exists seller_signal_statuses_user_builtin
  on public.seller_signal_statuses (user_id, builtin_key) where builtin_key is not null;

alter table public.seller_signal_statuses enable row level security;
revoke all on public.seller_signal_statuses from public, anon, authenticated;
grant select, insert, update, delete on public.seller_signal_statuses to authenticated;
grant all on public.seller_signal_statuses to service_role;

drop policy if exists "Read own seller statuses" on public.seller_signal_statuses;
drop policy if exists "Create own seller statuses" on public.seller_signal_statuses;
drop policy if exists "Update own seller statuses" on public.seller_signal_statuses;
drop policy if exists "Delete own seller statuses" on public.seller_signal_statuses;
create policy "Read own seller statuses" on public.seller_signal_statuses
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own seller statuses" on public.seller_signal_statuses
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own seller statuses" on public.seller_signal_statuses
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own seller statuses" on public.seller_signal_statuses
  for delete to authenticated using ((select auth.uid()) = user_id);

-- No more than 30 statuses per account.
create or replace function public.seller_signal_statuses_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select count(*) from public.seller_signal_statuses where user_id = new.user_id) >= 30 then
    raise exception 'You can have up to 30 statuses.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists seller_signal_statuses_limit on public.seller_signal_statuses;
create trigger seller_signal_statuses_limit
  before insert on public.seller_signal_statuses
  for each row execute function public.seller_signal_statuses_limit();
