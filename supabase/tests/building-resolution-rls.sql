begin;
insert into public.leads(user_id,name,building)
select id,'Resolution fixture','__resolution_trigger_fixture__' from auth.users order by id limit 1;
insert into public.leads(user_id,name,building)
select id,'Resolution fixture','__resolution_trigger_fixture__' from auth.users order by id limit 1;
do $$ begin
  if (select count(*) from public.building_resolutions where raw_name='__resolution_trigger_fixture__') <> 1 then
    raise exception 'Lead trigger did not deduplicate building names';
  end if;
end $$;
insert into public.building_resolutions(user_id,raw_name)
select id,'__resolution_rls_fixture__' from auth.users order by id limit 2;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.building_resolutions where raw_name='__resolution_rls_fixture__') <> 1 then
    raise exception 'Owner cannot see exactly their own fixture';
  end if;
  if exists(select 1 from public.building_resolutions where user_id <> auth.uid()) then
    raise exception 'Cross-account resolution leaked';
  end if;
  if has_function_privilege('authenticated','public.claim_building_resolutions(integer)','EXECUTE') then
    raise exception 'User can claim internal work';
  end if;
  begin
    update public.building_resolutions set status='review' where raw_name='__resolution_rls_fixture__';
    raise exception 'User could mutate internal decisions';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.building_resolutions;
    raise exception 'Anonymous resolution access';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local role service_role;
do $$ declare n integer; begin
  select count(*) into n from public.claim_building_resolutions(1000);
  if n > 16 then raise exception 'Unbounded worker batch'; end if;
  begin
    update public.building_resolutions set status='matched',building_key='__invented_fixture_key__'
      where raw_name='__resolution_rls_fixture__';
    raise exception 'Invented catalogue ID accepted';
  exception when foreign_key_violation then null;
  end;
end $$;
reset role;
rollback;
