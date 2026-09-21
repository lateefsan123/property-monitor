create table public.seller_signal_building_schedules (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  fill_unused boolean not null default false,
  days jsonb not null default '{"Monday":[],"Tuesday":[],"Wednesday":[],"Thursday":[],"Friday":[],"Saturday":[],"Sunday":[]}'::jsonb,
  constraint schedule_days_object check (jsonb_typeof(days) = 'object'),
  constraint schedule_days_complete check (days ?& array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']),
  constraint schedule_day_arrays check (
    jsonb_typeof(days->'Monday') = 'array' and jsonb_typeof(days->'Tuesday') = 'array' and
    jsonb_typeof(days->'Wednesday') = 'array' and jsonb_typeof(days->'Thursday') = 'array' and
    jsonb_typeof(days->'Friday') = 'array' and jsonb_typeof(days->'Saturday') = 'array' and
    jsonb_typeof(days->'Sunday') = 'array'
  ),
  constraint schedule_size check (octet_length(days::text) <= 220000)
);
alter table public.seller_signal_building_schedules
  add constraint schedule_names check (not jsonb_path_exists(days, '$.*[*] ? (@.type() != "string")')),
  add constraint schedule_name_lengths check (not jsonb_path_exists(days, '$.*[*] ? (@ like_regex "^\\s*$" || @ like_regex ".{150}.{151}")')),
  add constraint schedule_building_limit check (greatest(
    jsonb_array_length(days->'Monday'), jsonb_array_length(days->'Tuesday'),
    jsonb_array_length(days->'Wednesday'), jsonb_array_length(days->'Thursday'),
    jsonb_array_length(days->'Friday'), jsonb_array_length(days->'Saturday'),
    jsonb_array_length(days->'Sunday')) <= 100);
alter table public.seller_signal_building_schedules enable row level security;
revoke all on public.seller_signal_building_schedules from public, anon, authenticated;
grant select, insert, update on public.seller_signal_building_schedules to authenticated;
grant all on public.seller_signal_building_schedules to service_role;
create policy "Read own building schedule" on public.seller_signal_building_schedules for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own building schedule" on public.seller_signal_building_schedules for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own building schedule" on public.seller_signal_building_schedules for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
