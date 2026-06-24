create table if not exists public.whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'meta' check (provider in ('meta')),
  meta_business_id text,
  waba_id text not null,
  phone_number_id text not null,
  display_phone_number text,
  business_name text,
  connection_status text not null default 'pending' check (connection_status in ('pending', 'connected', 'disabled', 'error')),
  last_error text,
  raw_account jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, phone_number_id)
);

create table if not exists public.whatsapp_account_secrets (
  account_id uuid primary key references public.whatsapp_accounts(id) on delete cascade,
  access_token text not null,
  token_type text,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.whatsapp_accounts(id) on delete set null,
  lead_id integer references public.leads(id) on delete set null,
  direction text not null default 'outbound' check (direction in ('outbound', 'inbound')),
  recipient_phone text not null,
  message_type text not null default 'template' check (message_type in ('template', 'text')),
  template_name text,
  template_language text not null default 'en_US',
  template_parameters jsonb not null default '[]'::jsonb,
  body text,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'received')),
  meta_message_id text,
  error_message text,
  raw_request jsonb not null default '{}'::jsonb,
  raw_response jsonb not null default '{}'::jsonb,
  queued_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists whatsapp_accounts_phone_number_id_idx
  on public.whatsapp_accounts (phone_number_id);

create index if not exists whatsapp_accounts_user_status_idx
  on public.whatsapp_accounts (user_id, connection_status);

create unique index if not exists whatsapp_messages_meta_message_id_idx
  on public.whatsapp_messages (meta_message_id)
  where meta_message_id is not null;

create index if not exists whatsapp_messages_user_created_idx
  on public.whatsapp_messages (user_id, created_at desc);

create index if not exists whatsapp_messages_lead_created_idx
  on public.whatsapp_messages (lead_id, created_at desc);

alter table public.whatsapp_accounts enable row level security;
alter table public.whatsapp_account_secrets enable row level security;
alter table public.whatsapp_messages enable row level security;

drop policy if exists "Users can read own WhatsApp accounts" on public.whatsapp_accounts;
create policy "Users can read own WhatsApp accounts"
on public.whatsapp_accounts
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own WhatsApp messages" on public.whatsapp_messages;
create policy "Users can read own WhatsApp messages"
on public.whatsapp_messages
for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.whatsapp_accounts to authenticated;
grant select on public.whatsapp_messages to authenticated;

revoke all on public.whatsapp_account_secrets from anon, authenticated;

drop trigger if exists set_whatsapp_accounts_updated_at on public.whatsapp_accounts;
create trigger set_whatsapp_accounts_updated_at
before update on public.whatsapp_accounts
for each row
execute function public.handle_updated_at();

drop trigger if exists set_whatsapp_account_secrets_updated_at on public.whatsapp_account_secrets;
create trigger set_whatsapp_account_secrets_updated_at
before update on public.whatsapp_account_secrets
for each row
execute function public.handle_updated_at();

drop trigger if exists set_whatsapp_messages_updated_at on public.whatsapp_messages;
create trigger set_whatsapp_messages_updated_at
before update on public.whatsapp_messages
for each row
execute function public.handle_updated_at();
