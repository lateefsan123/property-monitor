import { aiMapColumns } from "../../ai-mapper";
import { supabase } from "../../supabase";
import { IMPORT_BATCH_SIZE, IMPORT_SAMPLE_ROW_LIMIT } from "./constants";
import { buildMessage, buildRecentTransactions, extractBeds, extractTransactionDate, summarizeTransactions } from "./insight-utils";
import { cleanBuildingName, createLeadInsertRecord, getBuildingKeyVariants, mapStoredLeadRow, sortLeadsByPriority, startOfDay } from "./lead-utils";
import { buildGoogleCsvUrl, inferMapping, normalizeToken, parseCsvText, rowsToObjects } from "./spreadsheet";

const IMPORT_TRUNCATION_PATTERN = /\u2026|\.{3,}/;
const IMPORT_TRUNCATION_FIELDS = [
  { key: "name", label: "name" },
  { key: "building", label: "building" },
  { key: "unit", label: "unit" },
];
const SUPABASE_PAGE_SIZE = 1000;

function containsImportTruncation(value) {
  const raw = String(value || "").trim();
  return Boolean(raw) && IMPORT_TRUNCATION_PATTERN.test(raw);
}

function summarizeImportValue(value, limit = 44) {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (raw.length <= limit) return raw;
  return `${raw.slice(0, limit - 3).trim()}...`;
}

function collectSuspiciousImportRows(records, mapping, options = {}) {
  const { defaultBuilding = null, overrideBuilding = false, maxExamples = 5 } = options;
  let count = 0;
  const examples = [];

  for (const record of records || []) {
    const values = {
      name: mapping.name ? record[mapping.name] : "",
      building: overrideBuilding ? (defaultBuilding || "") : (mapping.building ? record[mapping.building] : (defaultBuilding || "")),
      unit: mapping.unit ? record[mapping.unit] : "",
    };

    const flaggedFields = IMPORT_TRUNCATION_FIELDS
      .map((field) => {
        const value = values[field.key];
        if (!containsImportTruncation(value)) return null;
        return { label: field.label, value: summarizeImportValue(value) };
      })
      .filter(Boolean);

    if (!flaggedFields.length) continue;

    count += 1;
    if (examples.length < maxExamples) {
      examples.push({ rowNumber: record.__row || "?", flaggedFields });
    }
  }

  return { count, examples };
}

function buildSuspiciousImportError(summary) {
  if (!summary?.count) return null;

  const exampleText = summary.examples
    .map((example) => {
      const fields = example.flaggedFields.map((field) => `${field.label} "${field.value}"`).join(", ");
      return `row ${example.rowNumber}: ${fields}`;
    })
    .join("; ");

  const remaining = summary.count - summary.examples.length;
  const remainingText = remaining > 0 ? ` (+${remaining} more)` : "";

  return `Import blocked: ${summary.count} row(s) contain possible truncation markers.${remainingText} ${exampleText} Fix the sheet values and re-import.`;
}

function mapStoredTransaction(transactionRow) {
  return {
    amount: transactionRow.amount,
    category: transactionRow.category,
    date: transactionRow.date,
    floor: transactionRow.floor,
    beds: transactionRow.beds,
    property: {
      floor: transactionRow.floor,
      beds: transactionRow.beds,
      type: transactionRow.property_type,
      built_up_area: transactionRow.builtup_area_sqft,
    },
    location: {
      location: transactionRow.location_name,
      full_location: transactionRow.full_location,
      coordinates: {
        latitude: transactionRow.latitude,
        longitude: transactionRow.longitude,
      },
    },
  };
}

async function selectAllRows(buildQuery, pageSize = SUPABASE_PAGE_SIZE) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery().range(from, to);
    if (error) throw new Error(error.message);

    const batch = data || [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

export async function fetchUserLeads(userId, today = startOfDay(new Date())) {
  const [leadRows, sentLeadRows] = await Promise.all([
    selectAllRows(() => supabase.from("leads").select("*").eq("user_id", userId).order("id")),
    selectAllRows(() => supabase.from("sent_leads").select("lead_id, sent_at").eq("user_id", userId).order("lead_id")),
  ]);

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

export async function fetchLeadSources(userId) {
  const { data, error } = await supabase
    .from("lead_sources")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data || [];
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

function emptyToNull(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function normalizePhoneKey(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function buildLeadStateKey(lead, sourceId = null) {
  return [
    sourceId ?? lead?.source_id ?? "legacy",
    normalizeToken(lead?.name),
    normalizeToken(cleanBuildingName(lead?.building)),
    normalizeToken(lead?.unit),
    normalizeToken(lead?.bedroom),
    normalizePhoneKey(lead?.phone),
  ].join(":");
}

function buildExistingLeadStateMap(rows, sourceId = null) {
  const map = new Map();

  for (const row of rows || []) {
    const key = buildLeadStateKey(row, sourceId);
    if (!key) continue;
    if (!map.has(key)) map.set(key, row);
  }

  return map;
}

function dedupeIncomingLeads(leads, sourceId = null) {
  const seen = new Set();
  const result = [];

  for (const lead of leads || []) {
    const key = buildLeadStateKey(lead, sourceId);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(lead);
  }

  return result;
}

function filterNewLeads(leads, existingRows, sourceId = null) {
  const existingState = buildExistingLeadStateMap(existingRows, sourceId);
  return dedupeIncomingLeads(leads, sourceId).filter((lead) => !existingState.has(buildLeadStateKey(lead, sourceId)));
}

function buildImportResult(allLeads, newLeads) {
  const totalRows = allLeads.length;
  const count = newLeads.length;
  return {
    count,
    totalRows,
    skippedCount: Math.max(totalRows - count, 0),
  };
}

function hasExplicitSourceBuilding(source) {
  return Boolean(String(source?.building_name || "").trim());
}

function isPlaceholderSourceLabel(source) {
  const label = String(source?.label || "").trim();
  return Boolean(label) && /^Spreadsheet\s+\d+$/i.test(label);
}

function shouldReplacePlaceholderSourceLeads(source, existingRows) {
  if (!isPlaceholderSourceLabel(source) || hasExplicitSourceBuilding(source) || !existingRows?.length) {
    return false;
  }

  const placeholderLabel = String(source?.label || "").trim();
  return existingRows.every((row) => String(row?.building || "").trim() === placeholderLabel);
}

function getRepairCandidateSourceLabels(source) {
  const candidates = new Set();
  const buildingName = String(source?.building_name || "").trim();
  const label = String(source?.label || "").trim();
  if (buildingName) candidates.add(buildingName);
  if (label && !isPlaceholderSourceLabel(source)) candidates.add(label);
  return [...candidates];
}

function shouldReplaceNamedSourceLeads(source, existingRows, incomingLeads) {
  if (!existingRows?.length || !incomingLeads?.length) return false;

  for (const candidate of getRepairCandidateSourceLabels(source)) {
    const existingAllUseCandidate = existingRows.every((row) => String(row?.building || "").trim() === candidate);
    if (!existingAllUseCandidate) continue;

    const incomingHasDifferentBuilding = incomingLeads.some((lead) => {
      const building = String(lead?.building || "").trim();
      return Boolean(building) && building !== candidate;
    });
    if (incomingHasDifferentBuilding) return true;
  }

  return false;
}

async function fetchExistingLeadsForSource(userId, sourceId) {
  return selectAllRows(() => {
    const query = supabase
      .from("leads")
      .select("id, source_id, name, building, bedroom, unit, phone, status, last_contact, sent_at, notes")
      .eq("user_id", userId)
      .order("id");

    return sourceId ? query.eq("source_id", sourceId) : query.is("source_id", null);
  });
}

export async function updateLead({ userId, leadId, updates }) {
  if (!userId || !leadId) return;

  const payload = {};
  if (Object.prototype.hasOwnProperty.call(updates || {}, "name")) payload.name = emptyToNull(updates?.name);
  if (Object.prototype.hasOwnProperty.call(updates || {}, "building")) payload.building = emptyToNull(updates?.building);
  if (Object.prototype.hasOwnProperty.call(updates || {}, "bedroom")) payload.bedroom = emptyToNull(updates?.bedroom);
  if (Object.prototype.hasOwnProperty.call(updates || {}, "unit")) payload.unit = emptyToNull(updates?.unit);
  if (Object.prototype.hasOwnProperty.call(updates || {}, "phone")) payload.phone = emptyToNull(updates?.phone);
  if (Object.prototype.hasOwnProperty.call(updates || {}, "status")) payload.status = emptyToNull(updates?.status);
  if (Object.prototype.hasOwnProperty.call(updates || {}, "lastContact")) payload.last_contact = updates?.lastContact || null;
  if (Object.prototype.hasOwnProperty.call(updates || {}, "notes")) payload.notes = updates?.notes?.trim() || null;

  if (!Object.keys(payload).length) return;

  const { error } = await supabase
    .from("leads")
    .update(payload)
    .eq("user_id", userId)
    .eq("id", leadId);

  if (error) throw new Error(error.message);
}

export async function deleteLead({ userId, leadId }) {
  if (!userId || !leadId) return;

  const { error: sentDeleteError } = await supabase
    .from("sent_leads")
    .delete()
    .eq("user_id", userId)
    .eq("lead_id", leadId);
  if (sentDeleteError) throw new Error(sentDeleteError.message);

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("user_id", userId)
    .eq("id", leadId);

  if (error) throw new Error(error.message);
}

export async function createDefaultLeadSources(userId, count = 10, startSortOrder = 0) {
  const defaults = Array.from({ length: count }, (_, index) => ({
    user_id: userId,
    label: "",
    type: "building",
    building_name: "",
    sheet_url: null,
    sort_order: startSortOrder + index,
  }));

  if (!defaults.length) return;

  const { error } = await supabase.from("lead_sources").insert(defaults);
  if (error) throw new Error(error.message);
}

export async function createLeadSource(userId, fields = {}) {
  const payload = {
    user_id: userId,
    label: fields.label || "",
    type: "building",
    building_name: fields.building_name || null,
    sheet_url: fields.sheet_url || null,
    sort_order: fields.sort_order ?? 0,
  };

  const { data, error } = await supabase
    .from("lead_sources")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function upsertLeadSource(source) {
  const payload = {
    id: source.id,
    user_id: source.user_id,
    label: source.label,
    type: source.type,
    building_name: source.building_name || null,
    sheet_url: source.sheet_url || null,
    sort_order: source.sort_order ?? 0,
  };

  const { error } = await supabase
    .from("lead_sources")
    .upsert(payload, { onConflict: "id" });

  if (error) throw new Error(error.message);
}

export async function clearLeadsForSource(userId, sourceId) {
  if (!sourceId) return;

  const leadRows = await selectAllRows(() => (
    supabase
      .from("leads")
      .select("id")
      .eq("user_id", userId)
      .eq("source_id", sourceId)
      .order("id")
  ));

  const leadIds = leadRows.map((row) => row.id);
  if (leadIds.length) {
    const { error: sentDeleteError } = await supabase.from("sent_leads").delete().in("lead_id", leadIds);
    if (sentDeleteError) throw new Error(sentDeleteError.message);
  }

  const { error: leadDeleteError } = await supabase
    .from("leads")
    .delete()
    .eq("user_id", userId)
    .eq("source_id", sourceId);
  if (leadDeleteError) throw new Error(leadDeleteError.message);
}

export async function deleteLeadSource(userId, sourceId) {
  if (!sourceId) return;

  const { error } = await supabase
    .from("lead_sources")
    .delete()
    .eq("user_id", userId)
    .eq("id", sourceId);

  if (error) throw new Error(error.message);
}

async function clearLegacyLeads(userId) {
  const legacyRows = await selectAllRows(() => (
    supabase
      .from("leads")
      .select("id")
      .eq("user_id", userId)
      .is("source_id", null)
      .order("id")
  ));

  const legacyIds = legacyRows.map((row) => row.id);
  if (legacyIds.length) {
    const { error: sentDeleteError } = await supabase.from("sent_leads").delete().in("lead_id", legacyIds);
    if (sentDeleteError) throw new Error(sentDeleteError.message);
  }

  const { error: leadDeleteError } = await supabase
    .from("leads")
    .delete()
    .eq("user_id", userId)
    .is("source_id", null);
  if (leadDeleteError) throw new Error(leadDeleteError.message);
}

export async function replaceLegacyLeadsFromSheet({ userId, rawSheetUrl }) {
  const sheetUrl = String(rawSheetUrl || "").trim();
  if (!sheetUrl) throw new Error("Paste a Google Sheet URL first.");

  const csvUrl = buildGoogleCsvUrl(sheetUrl);
  if (!csvUrl) throw new Error("Invalid Google Sheet URL. Paste the full URL from your browser.");

  let response;
  try {
    response = await fetch(csvUrl);
  } catch {
    throw new Error("Could not fetch the sheet. Make sure the link is public (Share > Anyone with the link) and paste the full URL or sheet ID.");
  }

  if (!response.ok) {
    throw new Error(`Failed to load sheet (${response.status}). Make sure the sheet is shared publicly or "Anyone with the link".`);
  }

  const csvText = await response.text();
  const rawRows = parseCsvText(csvText);
  const { headers, records } = rowsToObjects(rawRows);

  if (!headers.length) throw new Error("Sheet has no header row.");

  let mapping = inferMapping(headers);
  if (!(mapping.name && mapping.building)) {
    mapping = await aiMapColumns(headers, rawRows.slice(0, IMPORT_SAMPLE_ROW_LIMIT));
  }

  if (!mapping.name && !mapping.building && !mapping.phone) {
    throw new Error("Could not map any columns. Make sure the sheet has seller names, buildings, or phone numbers.");
  }

  const leadsToInsert = records
    .map((record) => createLeadInsertRecord(record, mapping, userId, {
      sourceId: null,
      defaultStatus: "Prospect",
      defaultBuilding: null,
      overrideBuilding: false,
    }))
    .filter(Boolean);

  if (!leadsToInsert.length) throw new Error("No valid leads found in sheet.");

  await clearLegacyLeads(userId);

  for (let index = 0; index < leadsToInsert.length; index += IMPORT_BATCH_SIZE) {
    const batch = leadsToInsert.slice(index, index + IMPORT_BATCH_SIZE);
    const { error } = await supabase.from("leads").insert(batch);
    if (error) throw new Error(error.message);
  }

  return buildImportResult(leadsToInsert, leadsToInsert);
}

export async function replaceUserLeadsFromSheet({ userId, source, rawSheetUrl, replaceExisting = false }) {
  const sheetUrl = String(rawSheetUrl || source?.sheet_url || "").trim();
  if (!sheetUrl) throw new Error("Paste a Google Sheet URL first.");

  const csvUrl = buildGoogleCsvUrl(sheetUrl);
  if (!csvUrl) throw new Error("Invalid Google Sheet URL. Paste the full URL from your browser.");

  let response;
  try {
    response = await fetch(csvUrl);
  } catch {
    throw new Error("Could not fetch the sheet. Make sure the link is public (Share > Anyone with the link) and paste the full URL or sheet ID.");
  }

  if (!response.ok) {
    throw new Error(`Failed to load sheet (${response.status}). Make sure the sheet is shared publicly or "Anyone with the link".`);
  }

  const csvText = await response.text();
  const rawRows = parseCsvText(csvText);
  const { headers, records } = rowsToObjects(rawRows);

  if (!headers.length) throw new Error("Sheet has no header row.");

  let mapping = inferMapping(headers);
  if (!(mapping.name && mapping.building)) {
    mapping = await aiMapColumns(headers, rawRows.slice(0, IMPORT_SAMPLE_ROW_LIMIT));
  }

  if (!mapping.name && !mapping.building && !mapping.phone) {
    throw new Error("Could not map any columns. Make sure the sheet has seller names, buildings, or phone numbers.");
  }

  const defaultStatus = "Prospect";
  const defaultBuilding = null;
  const overrideBuilding = false;

  const suspiciousRows = collectSuspiciousImportRows(records, mapping, {
    defaultBuilding,
    overrideBuilding,
  });
  const suspiciousImportError = buildSuspiciousImportError(suspiciousRows);
  if (suspiciousImportError) throw new Error(suspiciousImportError);

  const leadsToInsert = records
    .map((record) => createLeadInsertRecord(record, mapping, userId, {
      sourceId: source?.id || null,
      defaultStatus,
      defaultBuilding,
      overrideBuilding,
    }))
    .filter(Boolean);

  if (!leadsToInsert.length) throw new Error("No valid leads found in sheet.");

  const sourceId = source?.id || null;
  const existingSourceLeads = await fetchExistingLeadsForSource(userId, sourceId);
  const shouldRepairPlaceholderImport = shouldReplacePlaceholderSourceLeads(source, existingSourceLeads);
  const shouldRepairNamedSourceImport = shouldReplaceNamedSourceLeads(source, existingSourceLeads, leadsToInsert);

  if ((replaceExisting || shouldRepairPlaceholderImport || shouldRepairNamedSourceImport) && sourceId) {
    await clearLeadsForSource(userId, sourceId);
  }

  const newLeadsToInsert = (replaceExisting || shouldRepairPlaceholderImport || shouldRepairNamedSourceImport)
    ? dedupeIncomingLeads(leadsToInsert, sourceId)
    : filterNewLeads(leadsToInsert, existingSourceLeads, sourceId);

  for (let index = 0; index < newLeadsToInsert.length; index += IMPORT_BATCH_SIZE) {
    const batch = newLeadsToInsert.slice(index, index + IMPORT_BATCH_SIZE);
    const { error } = await supabase.from("leads").insert(batch);
    if (error) throw new Error(error.message);
  }

  return buildImportResult(leadsToInsert, newLeadsToInsert);
}

export async function fetchLeadInsights(leads) {
  const targets = leads.filter((lead) => lead.building);
  if (!targets.length) {
    return { hasTargets: false, matched: 0, updates: {} };
  }

  const cleanedBuildings = {};
  for (const lead of targets) {
    const cleaned = cleanBuildingName(lead.building);
    const keys = getBuildingKeyVariants(lead.building);
    if (!keys.length) continue;
    for (const key of keys) {
      if (!cleanedBuildings[key]) cleanedBuildings[key] = cleaned;
    }
  }

  const buildingKeys = Object.keys(cleanedBuildings);
  if (!buildingKeys.length) {
    return { hasTargets: false, matched: 0, updates: {} };
  }

  const [{ data: buildingRows, error: buildingError }, { data: transactionRows, error: transactionError }] = await Promise.all([
    supabase.from("buildings").select("key, location_name").in("key", buildingKeys),
    supabase.from("transactions").select("*").in("building_key", buildingKeys),
  ]);

  if (buildingError) throw new Error(buildingError.message);
  if (transactionError) throw new Error(transactionError.message);

  const buildingLookup = {};
  for (const building of buildingRows || []) buildingLookup[building.key] = building;

  const transactionsByBuilding = {};
  for (const transaction of transactionRows || []) {
    if (!transactionsByBuilding[transaction.building_key]) transactionsByBuilding[transaction.building_key] = [];
    transactionsByBuilding[transaction.building_key].push(mapStoredTransaction(transaction));
  }

  const updates = {};
  let matched = 0;

  for (const lead of targets) {
    const cleaned = cleanBuildingName(lead.building);
    const keys = getBuildingKeyVariants(lead.building);
    const matchedKey = keys.find((key) => buildingLookup[key]) || keys[0];
    const building = matchedKey ? buildingLookup[matchedKey] : null;
    const allTransactions = matchedKey ? (transactionsByBuilding[matchedKey] || []) : [];
    const locationName = building?.location_name || cleaned;

    if (!allTransactions.length) {
      updates[lead.id] = {
        status: "error",
        error: "Property market data is not available yet.",
        message: buildMessage(lead, null),
      };
      continue;
    }

    let filteredTransactions = allTransactions;
    if (Array.isArray(lead.bedFilterValues) && lead.bedFilterValues.length) {
      const bedroomMatches = allTransactions.filter((transaction) => {
        const beds = extractBeds(transaction);
        return beds !== null && lead.bedFilterValues.includes(beds);
      });
      if (bedroomMatches.length) filteredTransactions = bedroomMatches;
    }

    const metrics = summarizeTransactions(filteredTransactions);
    const recentTransactions = buildRecentTransactions(filteredTransactions, locationName);
    const allTransactionDates = filteredTransactions.map((transaction) => extractTransactionDate(transaction)).filter(Boolean);
    const insight = {
      status: "ready",
      ...metrics,
      locationName,
      recentTransactions,
      allTransactionDates,
    };

    updates[lead.id] = {
      ...insight,
      message: buildMessage(lead, insight),
    };
    matched += 1;
  }

  return { hasTargets: true, matched, updates };
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
