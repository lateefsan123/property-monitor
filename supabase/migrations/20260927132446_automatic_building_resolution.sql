-- Each account keeps its own resolution, without changing the imported lead.
create table public.building_resolutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_name text not null check (length(raw_name) between 1 and 1000),
  status text not null default 'pending' check (status in ('pending','processing','matched','review')),
  building_key text references public.buildings(key),
  method text,
  reason text,
  candidates jsonb not null default '[]',
  attempts integer not null default 0,
  lease_id uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, raw_name),
  check ((status = 'matched') = (building_key is not null))
);
alter table public.building_resolutions enable row level security;
revoke all on public.building_resolutions from public, anon, authenticated;
grant select on public.building_resolutions to authenticated;
grant all on public.building_resolutions to service_role;
create policy "Read own building resolutions" on public.building_resolutions
  for select to authenticated using ((select auth.uid()) = user_id);
create index building_resolutions_work on public.building_resolutions(status, updated_at);
create index building_resolutions_building on public.building_resolutions(building_key);

create schema if not exists private;
-- Trigger-only privileged insert: the originating lead write already enforces ownership.
create function private.enqueue_building_resolution() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is not null and length(trim(new.building)) between 1 and 1000 then
    insert into public.building_resolutions(user_id, raw_name)
    values(new.user_id, trim(new.building)) on conflict (user_id, raw_name) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.enqueue_building_resolution() from public, anon, authenticated;
create trigger enqueue_building_resolution after insert or update of building,user_id
  on public.leads for each row execute function private.enqueue_building_resolution();

insert into public.building_resolutions(user_id,raw_name)
select distinct user_id,trim(building) from public.leads
where user_id is not null and length(trim(building)) between 1 and 1000
on conflict (user_id,raw_name) do nothing;

create function public.claim_building_resolutions(batch_size integer default 16)
returns setof public.building_resolutions language sql security invoker set search_path = '' as $$
  update public.building_resolutions r set status='processing', attempts=r.attempts+1,
    lease_id=gen_random_uuid(), updated_at=now()
  where r.id in (
    select q.id from public.building_resolutions q
    where (q.status='pending' or (q.status='processing' and q.updated_at < now()-interval '15 minutes'))
      and q.attempts < 3
      and (q.attempts=0 or q.updated_at < now()-interval '10 minutes')
    order by q.created_at for update skip locked limit greatest(1,least(batch_size,16))
  ) returning r.*;
$$;
revoke all on function public.claim_building_resolutions(integer) from public, anon, authenticated;
grant execute on function public.claim_building_resolutions(integer) to service_role;

-- Reuse the existing internal automation secret; no credentials in the migration.
select cron.schedule('resolve-building-names','*/2 * * * *', $job$
  select net.http_post(
    url := 'https://zrqxaammmrydkekbphqa.supabase.co/functions/v1/resolve-building-names',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-auto-whatsapp-token',(select decrypted_secret from vault.decrypted_secrets where name='seller_signal_auto_whatsapp_token')),
    body := '{}'::jsonb, timeout_milliseconds := 120000
  ) where exists (select 1 from public.building_resolutions where status in ('pending','processing'));
$job$);
