-- Only the authenticated server endpoint can access encrypted credentials.
create table public.integration_oauth_pending (
  hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  feature text not null check (feature in ('sheets', 'email', 'calendar')),
  expires_at bigint not null,
  secret text not null
);
create index integration_pending_owner on public.integration_oauth_pending(user_id);
create index integration_pending_expiry on public.integration_oauth_pending(expires_at);
create table public.integration_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  feature text not null check (feature in ('sheets', 'email', 'calendar')),
  scopes text[] not null,
  expires_at bigint not null,
  secret text not null,
  primary key (user_id, provider, feature)
);
alter table public.integration_oauth_pending enable row level security;
alter table public.integration_connections enable row level security;
revoke all on public.integration_oauth_pending, public.integration_connections from public, anon, authenticated;
grant select, insert, update, delete on public.integration_oauth_pending, public.integration_connections to service_role;

create function public.consume_integration_oauth(p_hash text, p_user uuid, p_provider text, p_now bigint)
returns setof public.integration_oauth_pending
language sql security invoker set search_path = '' as $$
  delete from public.integration_oauth_pending
  where hash = p_hash and user_id = p_user and provider = p_provider and expires_at > p_now
  returning *;
$$;
revoke all on function public.consume_integration_oauth(text, uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.consume_integration_oauth(text, uuid, text, bigint) to service_role;
