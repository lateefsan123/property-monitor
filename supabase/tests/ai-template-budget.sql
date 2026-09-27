begin;
set local role service_role;
do $$ declare i integer; fixture uuid := gen_random_uuid(); today date := (now() at time zone 'UTC')::date; begin
  -- Isolate quota scenarios inside a transaction; all changes roll back.
  insert into private.ai_template_usage values(today,'app',0)
    on conflict(usage_day,bucket) do update set attempts=0;
  for i in 1..5 loop
    if not public.reserve_ai_template_draft(fixture) then raise exception 'Allowed attempt rejected'; end if;
  end loop;
  if public.reserve_ai_template_draft(fixture) then raise exception 'Sixth attempt accepted'; end if;
  update private.ai_template_usage set attempts=100 where usage_day=today and bucket='app';
  if public.reserve_ai_template_draft(gen_random_uuid()) then raise exception 'App budget exceeded'; end if;
  if public.reserve_ai_template_draft(null) then raise exception 'Null identity accepted'; end if;
end $$;
reset role;
do $$ begin
  if has_function_privilege('authenticated','public.reserve_ai_template_draft(uuid)','EXECUTE')
     or has_function_privilege('anon','public.reserve_ai_template_draft(uuid)','EXECUTE') then
    raise exception 'Untrusted caller can reserve for another account';
  end if;
end $$;
rollback;
