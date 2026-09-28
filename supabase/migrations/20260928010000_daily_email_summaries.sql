-- Private, server-managed daily briefings. No raw email bodies are persisted.
alter table public.integration_connections add column summary_revision uuid not null default gen_random_uuid();

create table public.email_summary_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false
);
create table public.email_daily_summaries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  summary_day date not null,
  connection_key text not null,
  status text not null check (status in ('processing', 'ready', 'failed')),
  attempts integer not null check (attempts between 1 and 2),
  run_id uuid not null,
  started_at timestamptz not null default now(),
  result jsonb,
  error_code text
);
alter table public.email_summary_preferences enable row level security;
alter table public.email_daily_summaries enable row level security;
revoke all on public.email_summary_preferences, public.email_daily_summaries from public, anon, authenticated;
grant select, insert, update, delete on public.email_summary_preferences, public.email_daily_summaries to service_role;

-- One winning worker across concurrent cron runs, phones and browser tabs.
create function public.claim_email_summary(p_user uuid, p_day date, p_connection text, p_run uuid)
returns setof public.email_daily_summaries language sql security invoker set search_path = '' as $$
  insert into public.email_daily_summaries as existing (user_id, summary_day, connection_key, status, attempts, run_id)
  select p_user, p_day, p_connection, 'processing', 1, p_run
  where exists (select 1 from public.email_summary_preferences where user_id = p_user and enabled)
    and exists (select 1 from public.integration_connections where user_id = p_user and feature = 'email')
  on conflict (user_id) do update set summary_day = excluded.summary_day,
    connection_key = excluded.connection_key, status = 'processing',
    attempts = case when existing.summary_day = excluded.summary_day then existing.attempts + 1 else 1 end,
    run_id = excluded.run_id, started_at = now(), result = null, error_code = null
  where existing.summary_day < excluded.summary_day
    or (existing.summary_day = excluded.summary_day and existing.attempts < 2 and (
      existing.connection_key <> excluded.connection_key
      or (existing.status = 'failed' and existing.started_at < now() - interval '15 minutes')
      or (existing.status = 'processing' and existing.started_at < now() - interval '5 minutes')
    ))
  returning *;
$$;
revoke all on function public.claim_email_summary(uuid, date, text, uuid) from public, anon, authenticated;
grant execute on function public.claim_email_summary(uuid, date, text, uuid) to service_role;

create function public.due_email_summaries(p_day date)
returns table(user_id uuid) language sql security invoker set search_path = '' as $$
  select p.user_id from public.email_summary_preferences p
  left join public.email_daily_summaries s on s.user_id = p.user_id
  where p.enabled and exists (select 1 from public.integration_connections c where c.user_id = p.user_id and c.feature = 'email')
    and (s.user_id is null or s.summary_day < p_day or (s.summary_day = p_day and s.attempts < 2 and (
      (s.status = 'failed' and s.started_at < now() - interval '15 minutes')
      or (s.status = 'processing' and s.started_at < now() - interval '5 minutes'))))
  order by s.started_at nulls first, p.user_id limit 25;
$$;
revoke all on function public.due_email_summaries(date) from public, anon, authenticated;
grant execute on function public.due_email_summaries(date) to service_role;
