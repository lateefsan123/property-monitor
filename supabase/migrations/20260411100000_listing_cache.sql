create table if not exists public.listing_cache (
  location_id text primary key,
  building_name text,
  search_name text,
  full_path text,
  image_url text,
  listing_count integer not null default 0,
  latest_verified_at text,
  lowest_price numeric,
  highest_price numeric,
  listings jsonb not null default '[]'::jsonb,
  fetch_error text,
  fetched_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.listing_cache enable row level security;

create index if not exists idx_listing_cache_fetched_at on public.listing_cache (fetched_at);
