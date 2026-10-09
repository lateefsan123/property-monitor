// Fills seller_building_index for accounts and checks the server-side seller
// list (seller_list_page_as) against the browser's own logic, filter by filter.
//
//   node scripts/verify-seller-list-parity.mjs --user=<uuid> [--user=...] [--top=5] [--backfill] [--skip-check]
//
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
// Runs in Dubai time, like the app's users. Prints differences and exits 1 if any.
process.env.TZ = "Asia/Dubai";
import { createServer } from "vite";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const option = (name) => args.filter((arg) => arg.startsWith(`--${name}=`)).map((arg) => arg.slice(name.length + 3));
const flag = (name) => args.includes(`--${name}`);
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent", optimizeDeps: { noDiscovery: true, include: [] } });
const load = (path) => vite.ssrLoadModule(path);
const { mapStoredLeadRow, sortLeadsByPriority, startOfDay } = await load("/src/features/seller-signal/lead-utils.js");
const { enrichLeadsWithDataQuality } = await load("/src/features/seller-signal/lead-data-quality.js");
const { applyAccountStatuses } = await load("/src/features/seller-signal/status-registry.js");
const { filterLeads, sortLeads, buildSellerBuildingOptions } = await load("/src/features/seller-signal/selectors.js");
const { getBuildingKeyVariants } = await load("/src/features/seller-signal/building-utils.js");
const { buildingIndexSignature, createBuildingIndexer } = await load("/src/features/seller-signal/building-index.js");
const { fetchAutomaticBuildingAliases } = await load("/shared/automatic-building-aliases.js");
const { selectCachedBuildings } = await load("/shared/cached-buildings.js");
const { MAX_MEANINGFUL_OVERDUE_DAYS } = await load("/src/features/seller-signal/constants.js");

const COLUMNS = "id, name, building, bedroom, unit, phone, status, last_contact, sent_at, next_follow_up_on, source_id, notes, message_draft";

async function all(build) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

async function accountInputs(userId) {
  const [leadRows, sentRows, statuses, ownAliases, automatic, cached] = await Promise.all([
    all(() => db.from("leads").select(COLUMNS).eq("user_id", userId).order("id")),
    all(() => db.from("sent_leads").select("lead_id, sent_at").eq("user_id", userId).order("lead_id").order("id")),
    all(() => db.from("seller_signal_statuses").select("*").eq("user_id", userId).order("id")),
    all(() => db.from("building_aliases").select("*").or(`is_global.eq.true,user_id.eq.${userId}`).order("alias_name")),
    fetchAutomaticBuildingAliases(db, userId),
    selectCachedBuildings(db),
  ]);
  const aliases = [...ownAliases.map((row) => ({ id: row.id, userId: row.user_id, aliasName: row.alias_name || "", aliasKey: row.alias_key || "", canonicalName: row.canonical_name || "", isGlobal: Boolean(row.is_global) })), ...automatic];
  return { leadRows, sentRows, statuses, aliases, cached };
}

async function backfill(userId, inputs) {
  const signature = buildingIndexSignature(inputs.aliases, inputs.cached);
  const index = createBuildingIndexer(inputs.aliases, inputs.cached);
  const names = [...new Set(inputs.leadRows.map((row) => String(row.building ?? "")).filter((name) => name.length <= 1000))];
  const rows = names.map((name) => ({ user_id: userId, signature, updated_at: new Date().toISOString(), ...index(name) }));
  for (let start = 0; start < rows.length; start += 500) {
    const { error } = await db.from("seller_building_index").upsert(rows.slice(start, start + 500), { onConflict: "user_id,raw_building" });
    if (error) throw new Error(error.message);
  }
  return { names: rows.length, signature };
}

// The browser's list, built the way useSellerSignalPage builds it.
async function browserList(userId, inputs, today, hotDate) {
  applyAccountStatuses(inputs.statuses);
  const sentMap = {};
  for (const row of inputs.leadRows) if (row.sent_at) sentMap[row.id] = new Date(row.sent_at).getTime();
  for (const row of inputs.sentRows) {
    const at = new Date(row.sent_at).getTime();
    if (!sentMap[row.lead_id] || at > sentMap[row.lead_id]) sentMap[row.lead_id] = at;
  }
  const mapped = sortLeadsByPriority(inputs.leadRows.map((row, index) => mapStoredLeadRow(row, index, today)).filter((lead) => lead.name || lead.building || lead.phone));
  const leads = enrichLeadsWithDataQuality(mapped, inputs.aliases, inputs.cached, userId);
  const keysOf = (lead) => getBuildingKeyVariants(lead.resolvedBuilding || lead.building);
  const due = [], scheduled = [], notInterested = [];
  for (const lead of leads) {
    if (lead.statusRule?.id === "not_interested") notInterested.push(lead);
    else if (lead.isDue) due.push(lead);
    else scheduled.push(lead);
  }
  scheduled.sort((a, b) => (a.nextDueDate?.getTime() || 0) - (b.nextDueDate?.getTime() || 0));
  const dueKeys = [...new Set(due.flatMap(keysOf))];
  const hotKeys = new Set();
  for (let start = 0; start < dueKeys.length; start += 300) {
    const { data, error } = await db.rpc("get_market_building_keys_with_transactions_on", { target_keys: dueKeys.slice(start, start + 300), target_date: hotDate });
    if (error) throw new Error(error.message);
    for (const row of data || []) hotKeys.add(row.building_key);
  }
  const hot = new Set(due.filter((lead) => keysOf(lead).some((k) => hotKeys.has(k))).map((lead) => lead.id));
  const dueOrdered = [...due].sort((left, right) => {
    const lh = hot.has(left.id), rh = hot.has(right.id);
    if (lh !== rh) return lh ? -1 : 1;
    const ln = !left.lastContactDate, rn = !right.lastContactDate;
    if (ln !== rn) return ln ? -1 : 1;
    return Math.min(right.overdueDays || 0, MAX_MEANINGFUL_OVERDUE_DAYS) - Math.min(left.overdueDays || 0, MAX_MEANINGFUL_OVERDUE_DAYS);
  });
  return { leads, due, scheduled, notInterested, dueOrdered, hot, keysOf };
}

async function availableKeys(keys) {
  const found = new Set();
  for (let start = 0; start < keys.length; start += 300) {
    const { data, error } = await db.rpc("get_available_market_building_keys", { target_keys: keys.slice(start, start + 300) });
    if (error) throw new Error(error.message);
    for (const row of data || []) found.add(row.building_key);
  }
  return found;
}

function scenarios(list) {
  const sources = [...new Set(list.leads.map((lead) => lead.sourceId || "legacy"))].slice(0, 3);
  const someBuildings = [...new Set(list.due.map((lead) => String(lead.building || "").trim().replace(/\s+/g, " ").toLowerCase()).filter(Boolean))].slice(0, 2);
  const someName = list.due.find((lead) => String(lead.name || "").length > 3)?.name?.slice(0, 3) || "a";
  const out = [];
  for (const view of ["active", "done"]) {
    out.push({ view });
    out.push({ view, sort: "alpha-asc" });
    out.push({ view, sort: "alpha-desc" });
    out.push({ view, search: someName.toLowerCase() });
    for (const source of sources) out.push({ view, source });
    if (someBuildings.length) out.push({ view, buildings: someBuildings });
  }
  out.push({ view: "active", statuses: ["not_interested"] });
  out.push({ view: "active", statuses: ["prospect", "not_interested"] });
  for (const quality of ["trusted", "partial", "review", "matching"]) out.push({ view: "active", quality });
  out.push({ view: "active", data: "with_data" });
  out.push({ view: "active", data: "no_data" });
  return out;
}

async function expected(list, s) {
  const includeNI = (s.statuses || []).includes("not_interested");
  const tabLeads = s.view === "done" ? list.scheduled : includeNI ? [...list.dueOrdered, ...list.notInterested] : list.dueOrdered;
  let insights = {};
  if (s.data) {
    const keys = [...new Set(tabLeads.flatMap(list.keysOf))].sort();
    const found = await availableKeys(keys);
    for (const lead of tabLeads) insights[lead.id] = { status: lead.building && list.keysOf(lead).some((k) => found.has(k)) ? "ready" : "error" };
  }
  const filtered = filterLeads({
    activeLeads: s.view === "done" ? [] : tabLeads, doneLeads: s.view === "done" ? tabLeads : [],
    buildingFilter: s.buildings || [], dataQualityFilter: s.quality || "all", dataFilter: s.data || "all", insights,
    searchTerm: s.search || "", sourceFilter: s.source || "all", statusFilter: s.statuses || [], viewTab: s.view,
  });
  const sorted = s.sort ? sortLeads(filtered, { field: "alpha", direction: s.sort === "alpha-asc" ? "asc" : "desc" }) : filtered;
  return { ids: sorted.map((lead) => Number(lead.id)), tabLeads };
}

async function serverPage(userId, s, page, today, hotDate, withOptions = false) {
  const { data, error } = await db.rpc("seller_list_page_as", {
    p_user_id: userId, p_view: s.view, p_source: s.source || "all", p_status_ids: s.statuses || [], p_building_keys: s.buildings || [],
    p_data_filter: s.data || "all", p_quality_filter: s.quality || "all", p_search: s.search || "",
    p_sort_field: s.sort ? "alpha" : "added", p_sort_dir: s.sort === "alpha-asc" ? "asc" : "desc",
    p_page: page, p_page_size: 500, p_time_zone: "Asia/Dubai", p_today: today, p_hot_date: hotDate, p_with_building_options: withOptions,
  });
  if (error) throw new Error(error.message);
  return data;
}

const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

async function check(userId, inputs) {
  const today = startOfDay(new Date());
  const todayKey = dateKey(today);
  const hotDate = todayKey; // TZ is Dubai, so the local and Dubai dates match.
  const list = await browserList(userId, inputs, today, hotDate);
  const problems = [];
  const first = await serverPage(userId, { view: "active" }, 1, todayKey, hotDate, true);
  const counts = { due: list.due.length, scheduled: list.scheduled.length, not_interested: list.notInterested.length, total_leads: list.leads.length };
  for (const [name, value] of Object.entries(counts)) if (first.counts[name] !== value) problems.push(`count ${name}: browser ${value}, server ${first.counts[name]}`);
  const quality = {};
  for (const lead of list.leads) quality[lead.dataQuality.level] = (quality[lead.dataQuality.level] || 0) + 1;
  for (const level of new Set([...Object.keys(quality), ...Object.keys(first.quality || {})])) {
    if ((quality[level] || 0) !== (first.quality?.[level] || 0)) problems.push(`quality ${level}: browser ${quality[level] || 0}, server ${first.quality?.[level] || 0}`);
  }
  const options = buildSellerBuildingOptions(list.dueOrdered);
  const serverOptions = first.building_options || [];
  if (JSON.stringify(options.map((o) => [o.key, o.label, o.count])) !== JSON.stringify(serverOptions.map((o) => [o.key, o.label, o.count]))) {
    const at = options.findIndex((o, i) => JSON.stringify([o.key, o.label, o.count]) !== JSON.stringify([serverOptions[i]?.key, serverOptions[i]?.label, serverOptions[i]?.count]));
    problems.push(`building options differ at ${at}: browser ${JSON.stringify(options[at])} server ${JSON.stringify(serverOptions[at])}`);
  }
  for (const s of scenarios(list)) {
    const { ids } = await expected(list, s);
    const pages = Math.min(3, Math.max(1, Math.ceil(ids.length / 500)));
    const got = [];
    let total = null;
    for (let page = 1; page <= pages; page += 1) {
      const data = await serverPage(userId, s, page, todayKey, hotDate);
      total = data.total;
      got.push(...data.rows.map((row) => Number(row.id)));
    }
    const want = ids.slice(0, got.length);
    if (total !== ids.length) problems.push(`${JSON.stringify(s)} total: browser ${ids.length}, server ${total}`);
    const at = want.findIndex((id, i) => id !== got[i]);
    if (at >= 0) problems.push(`${JSON.stringify(s)} order differs at ${at}: browser ${want.slice(at, at + 3)} server ${got.slice(at, at + 3)}`);
  }
  // Per-row fields on the first page.
  const byId = new Map(list.leads.map((lead) => [Number(lead.id), lead]));
  for (const row of first.rows) {
    const lead = byId.get(Number(row.id));
    if (!lead) { problems.push(`row ${row.id} missing in browser list`); continue; }
    if (lead.isDue !== row.is_due || (lead.overdueDays || 0) !== row.overdue_days) problems.push(`row ${row.id} due: browser ${lead.isDue}/${lead.overdueDays}, server ${row.is_due}/${row.overdue_days}`);
    if (lead.dataQuality.level !== row.dq_level) problems.push(`row ${row.id} quality: browser ${lead.dataQuality.level}, server ${row.dq_level}`);
    if (Boolean(list.hot.has(lead.id)) !== Boolean(row.is_hot)) problems.push(`row ${row.id} hot: browser ${list.hot.has(lead.id)}, server ${row.is_hot}`);
  }
  return problems;
}

let users = option("user");
const top = Number(option("top")[0] || 0);
if (top) {
  const { data, error } = await db.rpc("seller_list_top_accounts", { p_limit: top });
  if (error) throw new Error(`${error.message} (pass --user=<uuid> instead)`);
  users = [...users, ...data.map((row) => row.user_id)];
}
if (!users.length) throw new Error("Pass --user=<uuid> or --top=<n>.");

let failed = false;
for (const userId of users) {
  const started = Date.now();
  const inputs = await accountInputs(userId);
  if (flag("backfill")) {
    const result = await backfill(userId, inputs);
    console.log(`${userId}: indexed ${result.names} building names (${result.signature})`);
  }
  if (flag("skip-check")) continue;
  const problems = await check(userId, inputs);
  console.log(`${userId}: ${inputs.leadRows.length} sellers, ${problems.length ? `${problems.length} differences` : "matches"} (${Math.round((Date.now() - started) / 1000)}s)`);
  for (const problem of problems.slice(0, 25)) console.log(`  - ${problem}`);
  if (problems.length) failed = true;
}
await vite.close();
process.exitCode = failed ? 1 : 0;
