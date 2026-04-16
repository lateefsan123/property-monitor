create table if not exists public.notification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_push_token text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, expo_push_token)
);

drop trigger if exists set_notification_tokens_updated_at on public.notification_tokens;
create trigger set_notification_tokens_updated_at
before update on public.notification_tokens
for each row
execute function public.handle_updated_at();

alter table public.notification_tokens enable row level security;

drop policy if exists "Users manage own notification tokens" on public.notification_tokens;
create policy "Users manage own notification tokens"
on public.notification_tokens
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
