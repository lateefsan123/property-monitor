insert into public.building_aliases (
  user_id,
  alias_name,
  alias_key,
  canonical_name,
  is_global
)
select
  null,
  mapping.alias_name,
  mapping.alias_key,
  'Burj Vista',
  true
from (
  values
    ('Burj Vista 1', 'burjvista1'),
    ('Burj Vista 2', 'burjvista2')
) as mapping(alias_name, alias_key)
where not exists (
  select 1
  from public.building_aliases existing
  where existing.is_global = true
    and existing.alias_key = mapping.alias_key
);
