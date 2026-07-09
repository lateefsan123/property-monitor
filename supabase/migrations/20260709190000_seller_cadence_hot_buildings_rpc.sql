create or replace function public.get_market_building_keys_with_transactions_on(target_keys text[], target_date date)
returns table (building_key text)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct tx.building_key
  from public.transactions as tx
  where tx.building_key = any(coalesce(target_keys, array[]::text[]))
    and tx.date = target_date;
$$;

grant execute on function public.get_market_building_keys_with_transactions_on(text[], date) to anon, authenticated;
