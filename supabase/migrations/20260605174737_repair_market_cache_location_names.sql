with usable_transaction_locations as (
  select
    building_key,
    min(trim(location_name)) as location_name
  from public.transactions
  where nullif(trim(location_name), '') is not null
    and trim(location_name) <> '0'
    and lower(trim(location_name)) <> 'unknown'
  group by building_key
  having count(distinct trim(location_name)) = 1
)
update public.buildings as building
set location_name = usable_transaction_locations.location_name
from usable_transaction_locations
where building.key = usable_transaction_locations.building_key
  and (
    building.location_name is null
    or trim(building.location_name) = ''
    or trim(building.location_name) = '0'
    or lower(trim(building.location_name)) = 'unknown'
  );
