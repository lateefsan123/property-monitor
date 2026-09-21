-- Run after the schedule migration. Everything in this test is rolled back.
begin;
create temporary table schedule_test_users as select id from auth.users order by created_at limit 2;
do $$ begin
  if (select count(*) from schedule_test_users) < 2 then raise exception 'Two existing users needed for isolation test'; end if;
end $$;
select set_config('request.jwt.claim.sub', (select id::text from schedule_test_users order by id limit 1), true);
select set_config('schedule.test_other', (select id::text from schedule_test_users order by id desc limit 1), true);
insert into public.seller_signal_building_schedules(user_id) select id from schedule_test_users on conflict (user_id) do nothing;
set local role authenticated;
do $$ begin
  if (select count(*) from public.seller_signal_building_schedules) <> 1 then raise exception 'Cross-account read or missing own row'; end if;
  update public.seller_signal_building_schedules set fill_unused = not fill_unused where user_id = auth.uid();
  if not found then raise exception 'Own update failed'; end if;
  update public.seller_signal_building_schedules set enabled = true where user_id = current_setting('schedule.test_other')::uuid;
  if found then raise exception 'Cross-account update permitted'; end if;
  begin
    update public.seller_signal_building_schedules set user_id = gen_random_uuid() where user_id = auth.uid();
    raise exception 'Ownership reassignment permitted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.seller_signal_building_schedules(user_id) values (current_setting('schedule.test_other')::uuid);
    raise exception 'Cross-account insert permitted';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.seller_signal_building_schedules where user_id = auth.uid();
    raise exception 'Delete permitted';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
  begin
    perform * from public.seller_signal_building_schedules;
    raise exception 'Anonymous read permitted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'Schedule ownership checks passed; all test changes rolled back' as result;
rollback;
