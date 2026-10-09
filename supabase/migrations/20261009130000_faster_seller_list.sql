-- Faster seller_list_page: ranks sellers on narrow columns only (sorts no
-- longer spill to disk) and reads notes, drafts and building-match details for
-- the returned page only. Same results as 20261009120000.

create or replace function public.seller_token(value text)
returns text language sql immutable parallel safe as $$
  select pg_catalog.regexp_replace(pg_catalog.lower(coalesce(value, '')), '[^a-z0-9]', '', 'g')
$$;

create or replace function public.seller_building_key(value text)
returns text language sql immutable parallel safe as $$
  select pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(value, ''), E' \t\n\r\f\v'), '\s+', ' ', 'g'))
$$;

create or replace function public.seller_list_page_as(
  p_user_id uuid,
  p_view text default 'active',
  p_source text default 'all',
  p_status_ids text[] default '{}',
  p_building_keys text[] default '{}',
  p_data_filter text default 'all',
  p_quality_filter text default 'all',
  p_search text default '',
  p_sort_field text default 'added',
  p_sort_dir text default 'desc',
  p_page integer default 1,
  p_page_size integer default 10,
  p_time_zone text default 'Asia/Dubai',
  p_today date default null,
  p_hot_date date default null,
  p_lead_ids integer[] default null,
  p_with_building_options boolean default false
)
returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  uid uuid := p_user_id;
  tz text := 'Asia/Dubai';
  today date;
  manual_today date;
  hot_date date;
  page_size integer := greatest(0, least(coalesce(p_page_size, 10), 500));
  search_term text := lower(coalesce(p_search, ''));
  has_search boolean := coalesce(p_search, '') ~ '\S';
  statuses text[] := coalesce(p_status_ids, '{}');
  buildings text[] := coalesce(p_building_keys, '{}');
  include_ni boolean;
  done_view boolean := p_view = 'done';
  property_required boolean;
  result jsonb;
begin
  -- Signed-in users only ever read their own sellers; other accounts need the
  -- service role (backfill and parity scripts).
  if uid is null or (caller is not null and caller <> uid)
    or (caller is null and current_user not in ('service_role', 'postgres')) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_time_zone is not null and exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then
    tz := p_time_zone;
  end if;
  today := coalesce(p_today, (now() at time zone tz)::date);
  if abs(today - (now() at time zone tz)::date) > 1 then today := (now() at time zone tz)::date; end if;
  manual_today := ((today::timestamp at time zone tz) at time zone 'Asia/Dubai')::date;
  hot_date := coalesce(p_hot_date, (now() at time zone 'Asia/Dubai')::date);
  include_ni := 'not_interested' = any(statuses);
  property_required := uid <> '231dbddd-efae-45b6-99ce-a72d68c32043'::uuid;

  with rules as (
    select 'custom:' || s.id::text as rule_id, btrim(s.label) as label, coalesce(s.follow_up_days, 0) as days,
      true as exact, array[btrim(s.label)] as keywords,
      row_number() over (order by s.position nulls first, s.created_at) as ord
    from public.seller_signal_statuses s
    where s.user_id = uid and s.builtin_key is null and public.seller_token(s.label) <> ''
    union all
    select b.id, b.label,
      case when b.id = 'not_interested' then 0 else coalesce(o.follow_up_days, b.days) end,
      false, b.keywords, 1000 + b.pos
    from (values
      ('not_interested', 'Not Interested', 0, array['not interested', 'ni', 'cold'], 1),
      ('prospect', 'Prospect', 75, array['prospect'], 2),
      ('market_appraisal', 'Market Appraisal', 25, array['market appraisal', 'appraisal', 'valuation'], 3),
      ('for_sale_available', 'For Sale Available', 5, array['for sale available', 'for sale', 'available'], 4)
    ) as b(id, label, days, keywords, pos)
    left join public.seller_signal_statuses o on o.user_id = uid and o.builtin_key = b.id
  ),
  status_map as (
    select st.status, r.rule_id, r.days
    from (select distinct coalesce(status, '') as status from public.leads where user_id = uid) st
    left join lateral (
      select r.rule_id, r.days from rules r
      where public.seller_token(st.status) <> ''
        and ((r.exact and public.seller_token(r.label) = public.seller_token(st.status))
          or (not r.exact and exists (
            select 1 from unnest(r.keywords) k
            where strpos(public.seller_token(st.status), public.seller_token(k)) > 0)))
      order by r.exact desc, r.ord
      limit 1
    ) r on true
  ),
  base as materialized (
    select l.id, l.name, l.building, l.bedroom, l.unit, l.phone, l.sent_at,
      l.next_follow_up_on, l.source_id,
      sm.rule_id, sm.days as rule_days,
      greatest(case when extract(year from l.last_contact) between 1900 and 2100 then l.last_contact end,
        (l.sent_at at time zone tz)::date) as eff_last,
      coalesce(bi.match_status, case when coalesce(l.building, '') ~ '\S' then 'unmatched' else 'missing' end) as match_status,
      coalesce(bi.resolved_building, coalesce(l.building, '')) as resolved_building,
      coalesce(bi.canonical_token, public.seller_token(l.building)) as canonical_token,
      coalesce(bi.address_unit, '') as address_unit,
      coalesce(bi.key_variants, '{}') as key_variants,
      bi.user_id is not null as indexed
    from public.leads l
    left join status_map sm on sm.status = coalesce(l.status, '')
    left join public.seller_building_index bi on bi.user_id = l.user_id and bi.raw_building = coalesce(l.building, '')
    where l.user_id = uid
      and (coalesce(l.name, '') <> '' or coalesce(l.building, '') <> '' or coalesce(l.phone, '') <> '')
  ),
  cad as (
    select b.*,
      (b.rule_id is not null and (b.rule_id = 'not_interested' or b.rule_days = 0)) as no_follow,
      (b.next_follow_up_on is not null and b.rule_id is distinct from 'not_interested'
        and extract(year from b.next_follow_up_on) between 1900 and 2100) as manual
    from base b
  ),
  cad2 as (
    select c.*,
      case when not c.no_follow and c.eff_last is not null
        then c.eff_last + (case when c.rule_id is not null then c.rule_days else 75 end) end as base_next
    from cad c
  ),
  cad3 as (
    select c.*,
      case when c.base_next is not null
        then floor(extract(epoch from ((c.base_next::timestamp at time zone tz) - (today::timestamp at time zone tz))) / 86400)::integer end as base_d
    from cad2 c
  ),
  cadence as (
    select c.*,
      case when c.manual then (c.next_follow_up_on - manual_today) <= 0
        else (not c.no_follow and (c.eff_last is null or c.base_d <= 0)) end as is_due,
      case when c.manual then greatest(0, -(c.next_follow_up_on - manual_today))
        when not c.no_follow and c.eff_last is not null and c.base_d <= 0 then -c.base_d else 0 end as overdue,
      case when c.manual then c.next_follow_up_on else c.base_next end as next_due,
      c.eff_last is null as never
    from cad3 c
  ),
  quality as (
    select c.*,
      case when c.rule_id = 'not_interested' then 'ni' when c.is_due then 'due' else 'scheduled' end as part,
      coalesce(nullif(c.unit, ''), case when c.address_unit <> '' then 'Unit ' || c.address_unit else '' end) as lead_unit
    from cadence c
  ),
  tokens as (
    select q.*,
      regexp_replace(coalesce(q.phone, ''), '[^0-9]', '', 'g') as phone_digits,
      public.seller_token(q.name) as name_tok,
      public.seller_token(q.lead_unit) as unit_tok,
      public.seller_token(q.bedroom) as bed_tok
    from quality q
  ),
  dup as (
    select q.*,
      case
        when q.canonical_token = '' then ''
        when q.phone_digits <> '' and q.unit_tok <> '' then 'phone:' || q.phone_digits || ':' || q.canonical_token || ':' || q.unit_tok
        when q.name_tok <> '' and q.unit_tok <> '' then 'unit:' || q.name_tok || ':' || q.canonical_token || ':' || q.unit_tok
        when q.name_tok <> '' and q.phone_digits <> '' and q.bed_tok <> '' then 'contact:' || q.name_tok || ':' || q.phone_digits || ':' || q.canonical_token || ':' || q.bed_tok
        else '' end as dup_key
    from tokens q
  ),
  dup_counts as (
    select dup_key, count(*)::integer as n from dup where dup_key <> '' group by dup_key having count(*) > 1
  ),
  scored as (
    select d.*, coalesce(dc.n, case when d.dup_key <> '' then 1 else 0 end) as dup_count
    from dup d left join dup_counts dc on dc.dup_key = d.dup_key
  ),
  leveled as (
    select s.*,
      case
        when (s.dup_count >= 2)
          or (property_required and s.match_status in ('missing', 'invalid')) then 'review'
        when s.source_id is null
          or coalesce(s.name, '') !~ '\S' or coalesce(s.phone, '') !~ '\S'
          or (property_required and s.lead_unit !~ '\S') then 'partial'
        when property_required and s.match_status = 'unmatched' then 'matching'
        else 'trusted' end as dq_level
    from scored s
  ),
  hot_keys as (
    select distinct t.building_key
    from public.transactions t
    where t.date = hot_date
      and t.building_key = any (array(select distinct unnest(key_variants) from leveled where part = 'due'))
  ),
  marked as (
    select v.*,
      (v.part = 'due' and v.key_variants && array(select building_key from hot_keys)) as is_hot
    from leveled v
  ),
  tab as (
    select m.* from marked m
  ),
  -- Tab order as sort keys (k1 asc, k2-k5 desc, k6 asc nulls first, id asc);
  -- the page is read with a bounded top-N sort instead of ranking every row.
  in_tab as (
    select t.*,
      case when done_view or t.part = 'due' then 0 else 1 end as k1,
      (not done_view and t.part = 'due' and t.is_hot) as k2,
      (not done_view and t.part = 'due' and t.never) as k3,
      case when not done_view and t.part = 'due' then least(t.overdue, 90) else 0 end as k4,
      case when not done_view then t.overdue else 0 end as k5,
      case when done_view then t.next_due end as k6
    from tab t
    where case when done_view then t.part = 'scheduled'
      else t.part = 'due' or (include_ni and t.part = 'ni') end
  ),
  market_keys as (
    select distinct t.building_key
    from public.transactions t
    where p_data_filter in ('with_data', 'no_data') and not done_view
      and t.building_key = any (array(select distinct unnest(key_variants) from in_tab))
  ),
  filtered as (
    select i.* from in_tab i
    where (p_source = 'all' or (p_source = 'legacy' and i.source_id is null) or i.source_id::text = p_source)
      and (cardinality(buildings) = 0 or public.seller_building_key(i.building) = any (buildings))
      and (done_view or cardinality(statuses) = 0 or i.rule_id = any (statuses))
      and (done_view or p_data_filter not in ('with_data', 'no_data')
        or ((coalesce(i.building, '') <> '' and i.key_variants && array(select building_key from market_keys)) = (p_data_filter = 'with_data')))
      and (done_view or coalesce(p_quality_filter, 'all') = 'all' or i.dq_level = p_quality_filter)
      and (not has_search or strpos(lower(coalesce(i.name, '')), search_term) > 0
        or strpos(lower(coalesce(i.building, '')), search_term) > 0
        or strpos(lower(coalesce(i.resolved_building, '')), search_term) > 0
        or strpos(lower(coalesce(i.phone, '')), search_term) > 0)
  ),
  totals as (
    select count(*)::integer as total from filtered
  ),
  paging as (
    select t.total,
      greatest(1, ceil(t.total::numeric / greatest(page_size, 1))::integer) as total_pages
    from totals t
  ),
  page_offset as (
    select (least(greatest(coalesce(p_page, 1), 1), total_pages) - 1) * page_size as n from paging
  ),
  wanted as (
    (select f.*, 1 as branch from filtered f
    where p_lead_ids is null and page_size > 0 and p_sort_field is distinct from 'alpha'
    order by f.k1, f.k2 desc, f.k3 desc, f.k4 desc, f.k5 desc, f.k6 asc nulls first, f.id asc
    offset (select n from page_offset) limit page_size)
    union all
    (select f.*, 2 from filtered f
    where p_lead_ids is null and page_size > 0 and p_sort_field = 'alpha' and p_sort_dir = 'asc'
    order by lower(coalesce(f.name, '')) collate "und-x-icu" asc,
      f.k1, f.k2 desc, f.k3 desc, f.k4 desc, f.k5 desc, f.k6 asc nulls first, f.id asc
    offset (select n from page_offset) limit page_size)
    union all
    -- Name Z-A reverses the whole list, ties included.
    (select f.*, 3 from filtered f
    where p_lead_ids is null and page_size > 0 and p_sort_field = 'alpha' and p_sort_dir is distinct from 'asc'
    order by lower(coalesce(f.name, '')) collate "und-x-icu" desc,
      f.k1 desc, f.k2 asc, f.k3 asc, f.k4 asc, f.k5 asc, f.k6 desc nulls last, f.id desc
    offset (select n from page_offset) limit page_size)
    union all
    select t.*, 0, false, false, 0, 0, null::date, 0 from tab t
    where p_lead_ids is not null and t.id = any (p_lead_ids)
  ),
  numbered as (
    select w.*, row_number() over () as rn from wanted w
  )
  select jsonb_build_object(
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', w.id, 'name', w.name, 'building', w.building, 'bedroom', w.bedroom, 'unit', w.unit, 'phone', w.phone,
        'status', full_row.status, 'last_contact', full_row.last_contact, 'sent_at', w.sent_at, 'next_follow_up_on', w.next_follow_up_on,
        'source_id', w.source_id, 'notes', full_row.notes, 'message_draft', full_row.message_draft,
        'part', w.part, 'is_due', w.is_due, 'overdue_days', w.overdue, 'next_due_on', w.next_due, 'never_contacted', w.never,
        'is_hot', w.is_hot, 'dq_level', w.dq_level, 'dup_count', w.dup_count, 'match', coalesce(bi.match, '{}'::jsonb),
        'resolved_building', w.resolved_building, 'indexed', w.indexed,
        'sent_marker_at', greatest(w.sent_at, (select max(sl.sent_at) from public.sent_leads sl where sl.user_id = uid and sl.lead_id = w.id))
      ) order by w.rn)
      from numbered w
      join public.leads full_row on full_row.id = w.id
      left join public.seller_building_index bi on bi.user_id = uid and bi.raw_building = coalesce(w.building, '')), '[]'::jsonb),
    'total', (select total from paging),
    'total_pages', (select total_pages from paging),
    'safe_page', (select least(greatest(coalesce(p_page, 1), 1), total_pages) from paging),
    'counts', (select jsonb_build_object(
      'due', count(*) filter (where part = 'due'),
      'scheduled', count(*) filter (where part = 'scheduled'),
      'not_interested', count(*) filter (where part = 'ni'),
      'total_leads', count(*),
      'legacy', count(*) filter (where source_id is null),
      'unindexed', count(*) filter (where not indexed)) from tab),
    'quality', (select coalesce(jsonb_object_agg(dq_level, n), '{}'::jsonb) from (select dq_level, count(*) n from tab group by dq_level) q),
    -- Building filter options: the tab's buildings (spreadsheet filter only),
    -- labelled as written by the first seller in tab order, most sellers first.
    'building_options', case when p_with_building_options then coalesce((
      select jsonb_agg(jsonb_build_object('key', o.key, 'label', o.label, 'count', o.n) order by o.n desc, o.label collate "und-x-icu")
      from (
        select public.seller_building_key(i.building) as key,
          (array_agg(regexp_replace(btrim(i.building, E' \t\n\r\f\v'), '\s+', ' ', 'g')
            order by i.k1, i.k2 desc, i.k3 desc, i.k4 desc, i.k5 desc, i.k6 asc nulls first, i.id asc))[1] as label,
          count(*) as n
        from in_tab i
        where public.seller_building_key(i.building) <> ''
          and (p_source = 'all' or (p_source = 'legacy' and i.source_id is null) or i.source_id::text = p_source)
        group by 1
      ) o), '[]'::jsonb) end
  ) into result;

  return result;
end;
$$;
alter function public.seller_list_page_as(uuid, text, text, text[], text[], text, text, text, text, text, integer, integer, text, date, date, integer[], boolean) set work_mem = '64MB';
alter function public.seller_list_page_as(uuid, text, text, text[], text[], text, text, text, text, text, integer, integer, text, date, date, integer[], boolean) set statement_timeout = '8s';
revoke all on function public.seller_list_page_as(uuid, text, text, text[], text[], text, text, text, text, text, integer, integer, text, date, date, integer[], boolean) from public, anon;
grant execute on function public.seller_list_page_as(uuid, text, text, text[], text[], text, text, text, text, text, integer, integer, text, date, date, integer[], boolean) to authenticated, service_role;

-- The signed-in user's own list (what the app calls).
create or replace function public.seller_list_page(
  p_view text default 'active',
  p_source text default 'all',
  p_status_ids text[] default '{}',
  p_building_keys text[] default '{}',
  p_data_filter text default 'all',
  p_quality_filter text default 'all',
  p_search text default '',
  p_sort_field text default 'added',
  p_sort_dir text default 'desc',
  p_page integer default 1,
  p_page_size integer default 10,
  p_time_zone text default 'Asia/Dubai',
  p_today date default null,
  p_hot_date date default null,
  p_lead_ids integer[] default null,
  p_with_building_options boolean default false
)
returns jsonb
language sql stable security invoker set search_path = '' as $$
  select public.seller_list_page_as((select auth.uid()), p_view, p_source, p_status_ids, p_building_keys, p_data_filter,
    p_quality_filter, p_search, p_sort_field, p_sort_dir, p_page, p_page_size, p_time_zone, p_today, p_hot_date,
    p_lead_ids, p_with_building_options)
$$;
revoke all on function public.seller_list_page(text, text, text[], text[], text, text, text, text, text, integer, integer, text, date, date, integer[], boolean) from public, anon;
grant execute on function public.seller_list_page(text, text, text[], text[], text, text, text, text, text, integer, integer, text, date, date, integer[], boolean) to authenticated;
