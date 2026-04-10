create table if not exists public.listing_alerts_watchlists (
  user_id uuid not null references auth.users (id) on delete cascade,
  location_id text not null,
  building_name text,
  search_name text,
  full_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, location_id)
);

create table if not exists public.listing_alerts_tracked_listings (
  user_id uuid not null references auth.users (id) on delete cascade,
  location_id text not null,
  listing_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, location_id, listing_id)
);

create table if not exists public.listing_alerts_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  summary jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  change_items jsonb not null default '[]'::jsonb,
  listing_history jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_listing_alerts_watchlists_updated_at on public.listing_alerts_watchlists;
create trigger set_listing_alerts_watchlists_updated_at
before update on public.listing_alerts_watchlists
for each row
execute function public.handle_updated_at();

drop trigger if exists set_listing_alerts_tracked_listings_updated_at on public.listing_alerts_tracked_listings;
create trigger set_listing_alerts_tracked_listings_updated_at
before update on public.listing_alerts_tracked_listings
for each row
execute function public.handle_updated_at();

drop trigger if exists set_listing_alerts_state_updated_at on public.listing_alerts_state;
create trigger set_listing_alerts_state_updated_at
before update on public.listing_alerts_state
for each row
execute function public.handle_updated_at();

alter table public.listing_alerts_watchlists enable row level security;
alter table public.listing_alerts_tracked_listings enable row level security;
alter table public.listing_alerts_state enable row level security;

drop policy if exists "Users manage own listing alert watchlists" on public.listing_alerts_watchlists;
create policy "Users manage own listing alert watchlists"
on public.listing_alerts_watchlists
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own tracked listings" on public.listing_alerts_tracked_listings;
create policy "Users manage own tracked listings"
on public.listing_alerts_tracked_listings
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own listing alerts state" on public.listing_alerts_state;
create policy "Users can read own listing alerts state"
on public.listing_alerts_state
for select
to authenticated
using (auth.uid() = user_id);
