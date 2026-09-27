create table private.ai_template_usage (
  usage_day date not null,
  bucket text not null,
  attempts integer not null default 0 check (attempts >= 0),
  primary key (usage_day,bucket)
);
alter table private.ai_template_usage enable row level security;
revoke all on private.ai_template_usage from public,anon,authenticated;
grant usage on schema private to service_role;
grant all on private.ai_template_usage to service_role;

-- Called only by the authenticated Edge handler after verifying the session.
-- Serialize reservations so concurrent requests cannot exceed either budget.
create function public.reserve_ai_template_draft(account_id uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare usage_date date := (now() at time zone 'UTC')::date;
begin
  if account_id is null then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(728104,1);
  if coalesce((select attempts from private.ai_template_usage where usage_day=usage_date and bucket='app'),0)>=100
    or coalesce((select attempts from private.ai_template_usage where usage_day=usage_date and bucket=account_id::text),0)>=5 then
    return false;
  end if;
  insert into private.ai_template_usage(usage_day,bucket,attempts)
  values(usage_date,'app',1),(usage_date,account_id::text,1)
  on conflict(usage_day,bucket) do update set attempts=private.ai_template_usage.attempts+1;
  return true;
end;
$$;
revoke all on function public.reserve_ai_template_draft(uuid) from public,anon,authenticated;
grant execute on function public.reserve_ai_template_draft(uuid) to service_role;
