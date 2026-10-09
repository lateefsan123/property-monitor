-- Nearby sales: when a seller's building has no recent sale, transaction
-- updates can send recent sales in the same area instead, or what is listed
-- for sale in their building when the area had none either. Off until the
-- account turns it on.
alter table public.seller_signal_automation_settings
  add column if not exists nearby_sales_enabled boolean not null default false;

-- The DLD area of each building key: from its sales ("AREA -> Building"),
-- else from the building list. Used by seller-signal-auto-whatsapp only.
create or replace function public.seller_signal_building_areas(p_keys text[])
returns table (building_key text, area text)
language sql
stable
as $$
  select k.key, coalesce(t.area, b.area)
  from unnest(p_keys) as k(key)
  left join lateral (
    select upper(btrim(split_part(tx.full_location, '->', 1))) as area
    from public.transactions tx
    where tx.building_key = k.key and tx.full_location like '%->%'
    order by tx.date desc
    limit 1
  ) t on true
  left join lateral (
    select upper(btrim(case when bl.source = 'dld_citywide' then bl.source_area else bl.location_name end)) as area
    from public.buildings bl
    where bl.key = k.key
      and coalesce(btrim(case when bl.source = 'dld_citywide' then bl.source_area else bl.location_name end), '') not in ('', '0')
    limit 1
  ) b on true
  where coalesce(t.area, b.area) is not null;
$$;

revoke all on function public.seller_signal_building_areas(text[]) from public, anon, authenticated;
grant execute on function public.seller_signal_building_areas(text[]) to service_role;

-- Listings for sale per building name (Bayut), kept a week so each building
-- costs at most one lookup a week, including ones with nothing listed.
create table if not exists public.seller_signal_listing_snapshots (
  name_key text primary key,
  building_name text not null,
  location_id text,
  listing_count integer not null default 0,
  lowest_price numeric,
  highest_price numeric,
  listings jsonb not null default '[]'::jsonb,
  fetch_error text,
  fetched_at timestamptz not null default now()
);

alter table public.seller_signal_listing_snapshots enable row level security;
revoke all on table public.seller_signal_listing_snapshots from anon, authenticated;
