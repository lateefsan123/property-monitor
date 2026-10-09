-- Server-side seller list for the web Sellers page: one page of sellers plus
-- every count the page shows, so big accounts (26,000+ sellers) don't load the
-- whole list in the browser. The rules mirror the browser code exactly:
--   who is due          src/features/seller-signal/lead-utils.js (mapLeadRow, applyManualFollowUp)
--   status -> rule      shared/seller-statuses.js (mergeStatusRules, matchStatusRule)
--   ordering            src/features/seller-signal/useSellerSignalPage.js (dueLeadsOrdered, tabLeads)
--   filters             src/features/seller-signal/selectors.js (filterLeads)
--   data quality        src/features/seller-signal/lead-data-quality.js (enrichLeadsWithDataQuality)
-- Building matching stays in JavaScript: the browser (or the backfill script)
-- stores each building name's match in seller_building_index.
-- scripts/verify-seller-list-parity.mjs compares both for every account.

create table if not exists public.seller_building_index (
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_building text not null check (length(raw_building) <= 1000),
  signature text not null check (length(signature) <= 128),
  match jsonb not null default '{}'::jsonb check (octet_length(match::text) <= 4000),
  match_status text not null default 'unmatched' check (length(match_status) <= 40),
  resolved_building text not null default '' check (length(resolved_building) <= 1000),
  canonical_token text not null default '' check (length(canonical_token) <= 1000),
  address_unit text not null default '' check (length(address_unit) <= 200),
  key_variants text[] not null default '{}' check (cardinality(key_variants) <= 64),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, raw_building)
);

alter table public.seller_building_index enable row level security;

drop policy if exists "Users read own building index" on public.seller_building_index;
create policy "Users read own building index" on public.seller_building_index
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users write own building index" on public.seller_building_index;
create policy "Users write own building index" on public.seller_building_index
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own building index" on public.seller_building_index;
create policy "Users update own building index" on public.seller_building_index
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete own building index" on public.seller_building_index;
create policy "Users delete own building index" on public.seller_building_index
  for delete to authenticated using ((select auth.uid()) = user_id);

-- normalizeToken / token(): lower case, keep a-z and 0-9.
create or replace function public.seller_token(value text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]', '', 'g')
$$;

-- sellerBuildingKey / automaticAliasKey: trim, collapse spaces, lower case.
create or replace function public.seller_building_key(value text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select lower(regexp_replace(btrim(coalesce(value, ''), E' \t\n\r\f\v'), '\s+', ' ', 'g'))
$$;

-- Building names of this account that have no index row for the given
-- matcher signature (new names, or matched with older aliases/buildings).
create or replace function public.seller_list_unindexed_buildings(p_signature text, p_limit integer default 1000)
returns table (raw_building text)
language sql stable security invoker set search_path = '' as $$
  select distinct coalesce(l.building, '')
  from public.leads l
  left join public.seller_building_index bi
    on bi.user_id = l.user_id and bi.raw_building = coalesce(l.building, '') and bi.signature = p_signature
  where l.user_id = (select auth.uid()) and bi.user_id is null
    and length(coalesce(l.building, '')) <= 1000
  limit greatest(1, least(coalesce(p_limit, 1000), 5000))
$$;

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
language plpgsql stable security invoker set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
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
  if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
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
    select l.id, l.name, l.building, l.bedroom, l.unit, l.phone, l.status, l.last_contact, l.sent_at,
      l.next_follow_up_on, l.source_id, l.notes, l.message_draft,
      sm.rule_id, sm.days as rule_days,
      greatest(case when extract(year from l.last_contact) between 1900 and 2100 then l.last_contact end,
        (l.sent_at at time zone tz)::date) as eff_last,
      coalesce(bi.match_status, case when coalesce(l.building, '') ~ '\S' then 'unmatched' else 'missing' end) as match_status,
      coalesce(bi.match, '{}'::jsonb) as match,
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
      coalesce(nullif(c.unit, ''), case when c.address_unit <> '' then 'Unit ' || c.address_unit else '' end) as lead_unit,
      regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g') as phone_digits
    from cadence c
  ),
  dup as (
    select q.*,
      case
        when q.phone_digits <> '' and q.canonical_token <> '' and public.seller_token(q.lead_unit) <> ''
          then 'phone:' || q.phone_digits || ':' || q.canonical_token || ':' || public.seller_token(q.lead_unit)
        when public.seller_token(q.name) <> '' and q.canonical_token <> '' and public.seller_token(q.lead_unit) <> ''
          then 'unit:' || public.seller_token(q.name) || ':' || q.canonical_token || ':' || public.seller_token(q.lead_unit)
        when public.seller_token(q.name) <> '' and q.phone_digits <> '' and q.canonical_token <> '' and public.seller_token(q.bedroom) <> ''
          then 'contact:' || public.seller_token(q.name) || ':' || q.phone_digits || ':' || q.canonical_token || ':' || public.seller_token(q.bedroom)
        else '' end as dup_key
    from quality q
  ),
  scored as (
    select d.*,
      case when d.dup_key <> '' then count(*) over (partition by d.dup_key) else 0 end as dup_count
    from dup d
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
    select m.*,
      row_number() over (order by
        case when m.part = 'due' then 0 else 1 end,
        (m.part = 'due' and m.is_hot) desc,
        (m.part = 'due' and m.never) desc,
        case when m.part = 'due' then least(m.overdue, 90) else 0 end desc,
        m.overdue desc,
        m.id asc) as active_rank,
      row_number() over (order by m.next_due asc nulls first, m.id asc) as done_rank
    from marked m
  ),
  in_tab as (
    select t.*, case when done_view then t.done_rank else t.active_rank end as tab_rank
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
  ordered as (
    select f.*,
      row_number() over (order by
        case when p_sort_field = 'alpha' and p_sort_dir = 'asc' then lower(coalesce(f.name, '')) end collate "und-x-icu" asc,
        case when p_sort_field = 'alpha' and p_sort_dir = 'asc' then f.tab_rank end asc,
        case when p_sort_field = 'alpha' and p_sort_dir <> 'asc' then lower(coalesce(f.name, '')) end collate "und-x-icu" desc,
        case when p_sort_field = 'alpha' and p_sort_dir <> 'asc' then f.tab_rank end desc,
        f.tab_rank asc) as position
    from filtered f
  ),
  totals as (
    select count(*)::integer as total from ordered
  ),
  paging as (
    select t.total,
      greatest(1, ceil(t.total::numeric / greatest(page_size, 1))::integer) as total_pages
    from totals t
  ),
  wanted as (
    select o.* from ordered o, paging p
    where p_lead_ids is null and page_size > 0
      and o.position > (least(greatest(coalesce(p_page, 1), 1), p.total_pages) - 1) * page_size
      and o.position <= least(greatest(coalesce(p_page, 1), 1), p.total_pages) * page_size
    union all
    select t.*, 0 as tab_rank, 0 as position from tab t
    where p_lead_ids is not null and t.id = any (p_lead_ids)
  )
  select jsonb_build_object(
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', w.id, 'name', w.name, 'building', w.building, 'bedroom', w.bedroom, 'unit', w.unit, 'phone', w.phone,
        'status', w.status, 'last_contact', w.last_contact, 'sent_at', w.sent_at, 'next_follow_up_on', w.next_follow_up_on,
        'source_id', w.source_id, 'notes', w.notes, 'message_draft', w.message_draft,
        'part', w.part, 'is_due', w.is_due, 'overdue_days', w.overdue, 'next_due_on', w.next_due, 'never_contacted', w.never,
        'is_hot', w.is_hot, 'dq_level', w.dq_level, 'dup_count', w.dup_count, 'match', w.match,
        'resolved_building', w.resolved_building, 'indexed', w.indexed,
        'sent_marker_at', greatest(w.sent_at, (select max(sl.sent_at) from public.sent_leads sl where sl.user_id = uid and sl.lead_id = w.id))
      ) order by w.position)
      from wanted w), '[]'::jsonb),
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
          (array_agg(regexp_replace(btrim(i.building, E' \t\n\r\f\v'), '\s+', ' ', 'g') order by i.tab_rank))[1] as label,
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


-- Sellers per building name (trimmed, spaces collapsed, lower case) in a
-- spreadsheet, for the "Which building?" card and the Schedule page.
create or replace function public.seller_list_building_counts(p_source text default 'all')
returns table (building_key text, label text, sellers bigint)
language sql stable security invoker set search_path = '' as $$
  select public.seller_building_key(l.building) as building_key,
    (array_agg(regexp_replace(btrim(l.building, E' \t\n\r\f\v'), '\s+', ' ', 'g') order by l.id))[1] as label,
    count(*) as sellers
  from public.leads l
  where l.user_id = (select auth.uid())
    and public.seller_building_key(l.building) <> ''
    and (p_source = 'all' or (p_source = 'legacy' and l.source_id is null) or l.source_id::text = p_source)
  group by 1
$$;

revoke all on function public.seller_list_page(text, text, text[], text[], text, text, text, text, text, integer, integer, text, date, date, integer[], boolean) from public, anon;
grant execute on function public.seller_list_page(text, text, text[], text[], text, text, text, text, text, integer, integer, text, date, date, integer[], boolean) to authenticated;
revoke all on function public.seller_list_unindexed_buildings(text, integer) from public, anon;
grant execute on function public.seller_list_unindexed_buildings(text, integer) to authenticated;
revoke all on function public.seller_list_building_counts(text) from public, anon;
grant execute on function public.seller_list_building_counts(text) to authenticated;
alter function public.seller_list_page(text, text, text[], text[], text, text, text, text, text, integer, integer, text, date, date, integer[], boolean) set statement_timeout = '8s';
