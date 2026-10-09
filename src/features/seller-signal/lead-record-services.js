import { supabase } from "../../supabase";
import { PAGE_SIZE, STATUS_RULES } from "./constants";
import { mapStoredLeadRow, startOfDay, sortLeadsByPriority } from "./lead-utils";
import { normalizeStatusFilter } from "./status-filter-utils";
import { readPage, selectCountedRows } from "../../../shared/select-counted-rows.js";
import { ensureAccountStatuses } from "./status-registry";
import { fetchStatuses } from "./seller-status-services";
import { readSellerList, saveSellerList } from "./seller-list-cache";

const SUPABASE_PAGE_SIZE = 1000;
const SELLER_LIST_COLUMNS = "id, name, building, bedroom, unit, phone, status, last_contact, sent_at, next_follow_up_on, source_id, notes, message_draft";
const EMPTY_PAGE = { leads: [], sentMap: {}, totalCount: 0, sourceCounts: {} };

export async function selectAllRows(buildQuery, pageSize = SUPABASE_PAGE_SIZE) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await readPage(() => buildQuery().range(from, to));
    if (error) throw new Error(error.message);

    const batch = data || [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

export async function fetchUserLeads(userId, today = startOfDay(new Date())) {
  await ensureAccountStatuses(userId, fetchStatuses);
  const [leadRows, sentLeadRows] = await Promise.all([
    // Only the fields mapStoredLeadRow uses; 6 pages at a time for big accounts.
    selectCountedRows((count) => supabase.from("leads").select(SELLER_LIST_COLUMNS, count ? { count: "exact" } : {}).eq("user_id", userId).order("id"), 1000, 6),
    selectCountedRows((count) => supabase.from("sent_leads").select("lead_id, sent_at", count ? { count: "exact" } : {}).eq("user_id", userId).order("lead_id").order("id")),
  ]);
  saveSellerList(userId, leadRows || [], sentLeadRows || []);
  return mapUserLeadRows(leadRows, sentLeadRows, today);
}

// The list saved on this device from the last load, or null.
export async function readSavedUserLeads(userId, today = startOfDay(new Date())) {
  const saved = await readSellerList(userId);
  if (!saved) return null;
  // Custom statuses decide who's due, so load them before mapping.
  await ensureAccountStatuses(userId, fetchStatuses);
  return { ...mapUserLeadRows(saved.leadRows, saved.sentLeadRows, today), savedAt: saved.savedAt };
}

function mapUserLeadRows(leadRows, sentLeadRows, today) {
  const sentMap = {};
  for (const row of leadRows || []) {
    if (!row.sent_at) continue;
    sentMap[row.id] = new Date(row.sent_at).getTime();
  }
  for (const row of sentLeadRows || []) {
    const sentAt = new Date(row.sent_at).getTime();
    if (!sentMap[row.lead_id] || sentAt > sentMap[row.lead_id]) {
      sentMap[row.lead_id] = sentAt;
    }
  }

  const leads = sortLeadsByPriority(
    (leadRows || [])
      .map((row, index) => mapStoredLeadRow(row, index, today))
      .filter((lead) => lead.name || lead.building || lead.phone),
  );

  return { leads, sentMap };
}

function sanitizeIlikeTerm(value) {
  return String(value || "").trim().replace(/[%_,]/g, " ");
}

// PostgREST conditions for the chosen statuses: built-ins by keyword, the
// account's own by exact (case-insensitive) name.
function getStatusConditions(statusFilter) {
  const activeStatusIds = normalizeStatusFilter(statusFilter);
  const conditions = [];
  for (const statusId of activeStatusIds) {
    const rule = STATUS_RULES.find((item) => item.id === statusId);
    if (!rule?.keywords?.length) continue;
    if (rule.exact) conditions.push(`status.ilike.${sanitizeIlikeTerm(rule.label)}`);
    else conditions.push(...rule.keywords.map((keyword) => `status.ilike.%${keyword}%`));
  }
  return [...new Set(conditions)];
}

function applySellerLeadFilters(query, filters = {}) {
  const {
    searchTerm = "",
    sourceFilter = "all",
    statusFilter = "all",
    userId,
    viewTab = "active",
  } = filters;

  let next = query
    .eq("user_id", userId)
    .or("name.not.is.null,building.not.is.null,phone.not.is.null");

  if (viewTab === "done") next = next.not("sent_at", "is", null);
  else next = next.is("sent_at", null);

  if (sourceFilter === "legacy") {
    next = next.is("source_id", null);
  } else if (sourceFilter && sourceFilter !== "all") {
    next = next.eq("source_id", sourceFilter);
  }

  const statusConditions = getStatusConditions(statusFilter);
  if (statusConditions.length) {
    next = next.or(statusConditions.join(","));
  }

  const term = sanitizeIlikeTerm(searchTerm);
  if (term) {
    next = next.or([
      `name.ilike.%${term}%`,
      `building.ilike.%${term}%`,
      `phone.ilike.%${term}%`,
      `unit.ilike.%${term}%`,
    ].join(","));
  }

  return next;
}

function applySellerLeadSort(query, sortOption = {}) {
  const ascending = sortOption.direction === "asc";
  if (sortOption.field === "alpha") {
    return query
      .order("name", { ascending, nullsFirst: false })
      .order("id", { ascending: true });
  }
  return query.order("id", { ascending });
}

async function countLegacyLeads(userId) {
  const { count, error } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("source_id", null)
    .or("name.not.is.null,building.not.is.null,phone.not.is.null");

  if (error) throw new Error(error.message);
  return count || 0;
}

export async function fetchSellerLeadPage(options = {}) {
  const {
    currentPage = 1,
    pageSize = PAGE_SIZE,
    sortOption,
    userId,
  } = options;

  if (!userId) return EMPTY_PAGE;
  await ensureAccountStatuses(userId, fetchStatuses);

  const safePage = Math.max(1, Number(currentPage) || 1);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;
  const today = startOfDay(new Date());

  const leadQuery = applySellerLeadSort(
    applySellerLeadFilters(
      supabase.from("leads").select("*", { count: "exact" }),
      options,
    ),
    sortOption,
  ).range(from, to);

  const [{ data, error, count }, legacyCount] = await Promise.all([
    leadQuery,
    countLegacyLeads(userId),
  ]);

  if (error) throw new Error(error.message);

  const sentMap = {};
  const leads = (data || [])
    .map((row, index) => mapStoredLeadRow(row, from + index, today))
    .filter((lead) => lead.name || lead.building || lead.phone);

  for (const row of data || []) {
    if (row.sent_at) sentMap[row.id] = new Date(row.sent_at).getTime();
  }

  return {
    leads,
    sentMap,
    totalCount: count || 0,
    sourceCounts: {
      legacy: legacyCount,
    },
  };
}

export async function fetchSellerBuildingCleanupLeads(options = {}) {
  const {
    sourceFilter = "all",
    userId,
  } = options;

  if (!userId) return [];

  const rows = await selectAllRows(() => {
    let query = supabase
      .from("leads")
      .select("id, name, building, bedroom, unit, source_id")
      .eq("user_id", userId)
      .not("building", "is", null)
      .neq("building", "")
      .order("id");

    if (sourceFilter === "legacy") {
      query = query.is("source_id", null);
    } else if (sourceFilter && sourceFilter !== "all") {
      query = query.eq("source_id", sourceFilter);
    }

    return query;
  });

  return (rows || []).map((row) => ({
    id: row.id,
    name: row.name || "",
    building: row.building || "",
    bedroom: row.bedroom || "",
    unit: row.unit || "",
    sourceId: row.source_id || null,
  }));
}

export async function updateLeadStatus({ userId, leadId, status }) {
  if (!userId || !leadId) return;
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("user_id", userId)
    .eq("id", leadId);
  if (error) throw new Error(error.message);
}

export async function persistLeadSentState(userId, leadId, isSent) {
  const sentAt = isSent ? new Date().toISOString() : null;
  const { error } = await supabase
    .from("leads")
    .update({ sent_at: sentAt })
    .eq("user_id", userId)
    .eq("id", leadId);
  if (error) throw new Error(error.message);

  try {
    if (isSent) {
      const { error: legacyError } = await supabase.from("sent_leads").insert({ user_id: userId, lead_id: leadId, sent_at: sentAt });
      if (legacyError && legacyError.code !== "23505") {
        console.warn("Could not sync legacy sent_leads row", legacyError.message);
      }
    } else {
      const { error: legacyError } = await supabase.from("sent_leads").delete().eq("user_id", userId).eq("lead_id", leadId);
      if (legacyError) {
        console.warn("Could not clear legacy sent_leads row", legacyError.message);
      }
    }
  } catch (legacySyncError) {
    console.warn("Legacy sent state sync failed", legacySyncError);
  }

  return sentAt;
}

// Sellers per spreadsheet, counted in the database ("legacy" = no spreadsheet),
// so the Spreadsheets list stays right even if the full seller list is still
// loading or a load failed.
export async function fetchSourceSellerCounts(userId, sourceIds = []) {
  if (!userId) return {};
  const count = (sourceId) => {
    let query = supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", userId);
    query = sourceId ? query.eq("source_id", sourceId) : query.is("source_id", null);
    return readPage(() => query);
  };
  const ids = [...new Set(sourceIds.filter(Boolean))];
  const results = await Promise.all([...ids.map(count), count(null)]);
  const counts = {};
  results.forEach((result, index) => {
    if (result.error) throw new Error(result.error.message);
    counts[index < ids.length ? ids[index] : "legacy"] = result.count || 0;
  });
  return counts;
}
