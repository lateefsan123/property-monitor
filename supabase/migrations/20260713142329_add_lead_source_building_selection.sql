alter table public.lead_sources
  add column if not exists selected_buildings text[] not null default '{}';
