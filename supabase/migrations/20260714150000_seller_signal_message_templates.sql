create table if not exists public.seller_signal_message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  content text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint seller_signal_message_templates_name_length
    check (char_length(btrim(name)) between 1 and 80),
  constraint seller_signal_message_templates_content_length
    check (char_length(content) between 1 and 4000),
  constraint seller_signal_message_templates_transactions_token
    check (position('{{transactions}}' in content) > 0)
);

create unique index if not exists seller_signal_message_templates_user_name_idx
  on public.seller_signal_message_templates (user_id, lower(btrim(name)));

create unique index if not exists seller_signal_message_templates_one_default_idx
  on public.seller_signal_message_templates (user_id)
  where is_default = true;

create index if not exists seller_signal_message_templates_user_updated_idx
  on public.seller_signal_message_templates (user_id, updated_at desc);

alter table public.seller_signal_message_templates enable row level security;

drop policy if exists "Users can read own Seller Signal message templates" on public.seller_signal_message_templates;
create policy "Users can read own Seller Signal message templates"
on public.seller_signal_message_templates
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own Seller Signal message templates" on public.seller_signal_message_templates;
create policy "Users can insert own Seller Signal message templates"
on public.seller_signal_message_templates
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own Seller Signal message templates" on public.seller_signal_message_templates;
create policy "Users can update own Seller Signal message templates"
on public.seller_signal_message_templates
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own Seller Signal message templates" on public.seller_signal_message_templates;
create policy "Users can delete own Seller Signal message templates"
on public.seller_signal_message_templates
for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.seller_signal_message_templates to authenticated;

drop trigger if exists set_seller_signal_message_templates_updated_at on public.seller_signal_message_templates;
create trigger set_seller_signal_message_templates_updated_at
before update on public.seller_signal_message_templates
for each row
execute function public.handle_updated_at();
