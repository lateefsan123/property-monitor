-- Internal service-owned event state. Browser clients cannot read signing keys,
-- encrypted OAuth credentials, callback URLs or another account's deliveries.
create table public.mcp_event_subscriptions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null,
  lead_id integer references public.leads(id) on delete cascade,
  credentials text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index mcp_event_subscriptions_owner_idx on public.mcp_event_subscriptions(user_id, expires_at);
create index mcp_event_subscriptions_lead_idx on public.mcp_event_subscriptions(lead_id);
alter table public.mcp_event_subscriptions enable row level security;
revoke all on public.mcp_event_subscriptions from public, anon, authenticated;
grant all on public.mcp_event_subscriptions to service_role;

create table public.mcp_event_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id text not null references public.mcp_event_subscriptions(id) on delete cascade,
  message_id uuid not null references public.whatsapp_messages(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','delivered','failed','stopped')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(subscription_id, message_id)
);
create index mcp_event_deliveries_pending_idx on public.mcp_event_deliveries(available_at) where status = 'pending';
create index mcp_event_deliveries_message_idx on public.mcp_event_deliveries(message_id);
alter table public.mcp_event_deliveries enable row level security;
revoke all on public.mcp_event_deliveries from public, anon, authenticated;
grant all on public.mcp_event_deliveries to service_role;

create schema if not exists private;
create or replace function private.enqueue_seller_reply()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  -- Only trusted service ingest can enqueue; status updates and outbound sends
  -- never generate reply events. Messages must reference this owner's seller.
  if new.direction = 'inbound' and new.status = 'received' and new.lead_id is not null then
    insert into public.mcp_event_deliveries(subscription_id, message_id)
    select s.id, new.id from public.mcp_event_subscriptions s
    join public.leads l on l.id = new.lead_id and l.user_id = new.user_id
    where s.user_id = new.user_id and s.expires_at > now()
      and (s.lead_id is null or s.lead_id = new.lead_id)
    on conflict (subscription_id, message_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.enqueue_seller_reply() from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.enqueue_seller_reply() to service_role;
create trigger mcp_enqueue_seller_reply after insert on public.whatsapp_messages
for each row execute function private.enqueue_seller_reply();

-- One short lease per job; a crashed worker can retry using the same event ID.
create function public.claim_mcp_event_deliveries()
returns setof public.mcp_event_deliveries language sql security invoker set search_path = '' as $$
  update public.mcp_event_deliveries d
  set available_at = now() + interval '2 minutes', attempts = attempts + 1
  where d.id in (
    select q.id from public.mcp_event_deliveries q
    where q.status = 'pending' and q.available_at <= now() and q.attempts < 6
    order by q.available_at for update skip locked limit 5
  ) returning d.*;
$$;
revoke all on function public.claim_mcp_event_deliveries() from public, anon, authenticated;
grant execute on function public.claim_mcp_event_deliveries() to service_role;

-- Auth tables are not exposed by PostgREST. This service-only boolean check
-- detects client disconnect, session revocation and disabled/deleted users.
create function public.mcp_event_access_active(p_user uuid, p_client uuid, p_session uuid)
returns boolean language sql security definer set search_path = '' as $$
  select coalesce((select auth.jwt()->>'role') = 'service_role', false)
    and exists (select 1 from auth.users u where u.id=p_user
      and u.deleted_at is null and (u.banned_until is null or u.banned_until <= now()))
    and exists (select 1 from auth.oauth_consents c where c.user_id=p_user and c.client_id=p_client and c.revoked_at is null)
    and exists (select 1 from auth.oauth_clients c where c.id=p_client and c.deleted_at is null)
    and exists (select 1 from auth.sessions s where s.id=p_session and s.user_id=p_user
      and s.oauth_client_id=p_client and (s.not_after is null or s.not_after > now()));
$$;
revoke all on function public.mcp_event_access_active(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.mcp_event_access_active(uuid,uuid,uuid) to service_role;
