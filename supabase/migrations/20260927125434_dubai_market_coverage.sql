-- Additive public-market provenance; no account data or existing cache rows change.
alter table public.buildings add column if not exists source text;
alter table public.buildings add column if not exists source_project text;
alter table public.buildings add column if not exists source_area text;
alter table public.buildings add column if not exists source_updated_at timestamptz;
alter table public.transactions add column if not exists source text;
alter table public.transactions add column if not exists source_transaction_id text;
create unique index if not exists transactions_source_id_idx
  on public.transactions (source, source_transaction_id);

create or replace function public.sync_dld_citywide(p_buildings jsonb, p_transactions jsonb)
returns integer language plpgsql security invoker set search_path = public, pg_temp as $$
declare affected integer;
begin
  if jsonb_typeof(p_buildings) <> 'array' or jsonb_typeof(p_transactions) <> 'array'
    or jsonb_array_length(p_transactions) > 500 then
    raise exception 'Expected arrays with at most 500 transactions';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_buildings) as incoming(key text)
    join public.buildings b using (key) where b.source is distinct from 'dld_citywide'
  ) then raise exception 'Citywide project key conflicts with existing cache'; end if;
  insert into public.buildings (key, search_name, location_name, source, source_project, source_area, source_updated_at)
  select key, search_name, location_name, 'dld_citywide', source_project, source_area, now()
  from jsonb_to_recordset(p_buildings) as b(key text, search_name text, location_name text, source_project text, source_area text)
  on conflict (key) do update set search_name = excluded.search_name, location_name = excluded.location_name,
    source_project = excluded.source_project, source_area = excluded.source_area, source_updated_at = excluded.source_updated_at;
  if exists (
    select 1 from jsonb_to_recordset(p_transactions) as t(building_key text)
    left join public.buildings b on b.key = t.building_key
    where b.source is distinct from 'dld_citywide'
  ) then raise exception 'Transaction has no citywide project'; end if;
  insert into public.transactions (building_key, amount, category, date, beds, property_type, builtup_area_sqft,
    location_name, full_location, source, source_transaction_id)
  select building_key, amount, category, date, beds, property_type, builtup_area_sqft,
    location_name, full_location, 'dld_citywide', source_transaction_id
  from jsonb_to_recordset(p_transactions) as t(building_key text, amount numeric, category text, date date,
    beds text, property_type text, builtup_area_sqft numeric, location_name text, full_location text, source_transaction_id text)
  on conflict (source, source_transaction_id) do update set building_key = excluded.building_key,
    amount = excluded.amount, category = excluded.category, date = excluded.date, beds = excluded.beds,
    property_type = excluded.property_type, builtup_area_sqft = excluded.builtup_area_sqft,
    location_name = excluded.location_name, full_location = excluded.full_location;
  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function public.sync_dld_citywide(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.sync_dld_citywide(jsonb, jsonb) to service_role;
