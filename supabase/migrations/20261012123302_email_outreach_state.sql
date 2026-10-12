-- One durable, service-managed campaign per authenticated owner. No tokens in state.
create table public.email_outreach_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.email_outreach_state enable row level security;
revoke all on public.email_outreach_state from anon,authenticated;
grant all on public.email_outreach_state to service_role;

-- Atomic compare-and-swap. Workers reserve a contact before provider I/O;
-- a crash leaves it held for review rather than sending a duplicate.
create function public.save_email_outreach_state(p_user uuid,p_revision bigint,p_state jsonb)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_revision = -1 then
    insert into public.email_outreach_state(user_id,state) values(p_user,p_state)
      on conflict(user_id) do nothing;
  else
    update public.email_outreach_state set state=p_state,revision=revision+1,updated_at=now()
      where user_id=p_user and revision=p_revision;
  end if;
  return found;
end $$;
revoke all on function public.save_email_outreach_state(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.save_email_outreach_state(uuid,bigint,jsonb) to service_role;
