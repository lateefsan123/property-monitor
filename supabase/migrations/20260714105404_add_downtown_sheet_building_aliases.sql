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
  mapping.canonical_name,
  true
from (
  values
    ('Burj Lake Hotel - The Address Downtown', 'burjlakehoteltheaddressdowntown', 'The Address Downtown Hotel, Downtown Dubai'),
    ('Burj Lake Hotel', 'burjlakehotel', 'The Address Downtown Hotel, Downtown Dubai'),
    ('City Center Residences', 'citycenterresidences', 'City Center Residences, Downtown Dubai'),
    ('City Centre Residences', 'citycentreresidences', 'City Center Residences, Downtown Dubai'),
    ('BD 29 BLVD PODIUM', 'bd29blvdpodium', '29 Boulevard, Downtown Dubai'),
    ('BD 29 Boulevard PODIUM', 'bd29boulevardpodium', '29 Boulevard, Downtown Dubai'),
    ('Imperial Avenue', 'imperialavenue', 'Imperial Avenue, Downtown Dubai')
) as mapping(alias_name, alias_key, canonical_name)
where not exists (
  select 1
  from public.building_aliases existing
  where existing.is_global = true
    and existing.alias_key = mapping.alias_key
);

update public.leads
set building = 'City Center Residences, Downtown Dubai',
    updated_at = now()
where source_id in (
  select id
  from public.lead_sources
  where selected_buildings @> array['City Center Residences']::text[]
);

update public.leads
set building = 'The Address Downtown Hotel, Downtown Dubai',
    updated_at = now()
where source_id in (
  select id
  from public.lead_sources
  where selected_buildings @> array['Burj Lake Hotel - The Address DownTown']::text[]
);

update public.leads
set building = '29 Boulevard, Downtown Dubai',
    updated_at = now()
where source_id in (
  select id
  from public.lead_sources
  where selected_buildings @> array['BD 29 BLVD PODIUM']::text[]
);
