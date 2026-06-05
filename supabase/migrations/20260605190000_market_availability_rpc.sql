create or replace function public.get_available_market_building_keys(target_keys text[])
returns table (building_key text)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct tx.building_key
  from public.transactions as tx
  where tx.building_key = any(coalesce(target_keys, array[]::text[]));
$$;

grant execute on function public.get_available_market_building_keys(text[]) to anon, authenticated;
