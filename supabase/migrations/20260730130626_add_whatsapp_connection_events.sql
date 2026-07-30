create table public.whatsapp_connection_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  session_id text not null,
  event_type text not null default 'disconnected'
    check (event_type in ('disconnected')),
  reason_code text not null,
  reason_label text not null,
  status_code integer,
  message text,
  recoverable boolean not null default false,
  recovery_action text not null,
  recovered_at timestamptz,
  occurred_at timestamptz not null default timezone('utc', now()),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index whatsapp_connection_events_user_occurred_idx
  on public.whatsapp_connection_events (user_id, occurred_at desc);

create index whatsapp_connection_events_account_occurred_idx
  on public.whatsapp_connection_events (account_id, occurred_at desc);

create index whatsapp_connection_events_open_idx
  on public.whatsapp_connection_events (account_id, occurred_at desc)
  where recovered_at is null and recoverable;

alter table public.whatsapp_connection_events enable row level security;

create policy "Users can read own WhatsApp connection events"
on public.whatsapp_connection_events
for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.whatsapp_connection_events to authenticated;
revoke insert, update, delete on public.whatsapp_connection_events from anon, authenticated;

alter table public.whatsapp_accounts
  drop constraint if exists whatsapp_accounts_connection_status_check;

alter table public.whatsapp_accounts
  add constraint whatsapp_accounts_connection_status_check
  check (connection_status in ('pending', 'connected', 'disconnected', 'disabled', 'error'));

comment on table public.whatsapp_connection_events is
  'Durable, user-visible Baileys disconnect causes and recovery outcomes.';
