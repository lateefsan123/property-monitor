import { aiMapColumns } from "../../ai-mapper";
import { supabase } from "../../supabase";
import { IMPORT_BATCH_SIZE, IMPORT_SAMPLE_ROW_LIMIT } from "./constants";
import { canonicalizeBuildingName, parseBuildingAddressValue } from "./building-utils";
import { fetchCachedBuildings } from "./building-cache-services";
import { createLeadBuildingResolver, getInvalidBuildingValueIssue } from "./lead-data-quality";
import { createLeadInsertRecord } from "./lead-utils";
import { selectAllRows } from "./lead-record-services";
import { buildLeadSyncPlan } from "./lead-sync-plan";
import { buildImportQualityReport } from "./import-quality-report";
import { buildGoogleCsvUrl, inferMapping, parseCsvText, rowsToObjects } from "./spreadsheet";

const IMPORT_TRUNCATION_PATTERN = /\u2026|\.{3,}/;
const IMPORT_TRUNCATION_FIELDS = [
  { key: "building", label: "building" },
  { key: "unit", label: "unit" },
];

function emptyToNull(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function emptyBuildingToNull(value) {
  const invalidIssue = getInvalidBuildingValueIssue(value);
  if (invalidIssue) throw new Error(invalidIssue.label);
  const canonical = canonicalizeBuildingName(value);
  return canonical || null;
}

function containsImportTruncation(value) {
  const raw = String(value || "").trim();
  return Boolean(raw) && IMPORT_TRUNCATION_PATTERN.test(raw);
}

function getSuspiciousImportField(field, value) {
  if (containsImportTruncation(value)) {
    if (field.key !== "building") {
      return {
        label: field.label,
        value: summarizeImportValue(value),
        reason: "possible truncation",
      };
    }

    const address = parseBuildingAddressValue(value);
    if (!address.recoverableTruncation) {
      return {
        label: field.label,
        value: summarizeImportValue(value),
        reason: "possible truncation",
      };
    }
  }

  if (field.key === "building") {
    const invalidIssue = getInvalidBuildingValueIssue(value);
    if (invalidIssue) {
      return {
        label: field.label,
        value: summarizeImportValue(value),
        reason: invalidIssue.label,
      };
    }
  }

  return null;
}

function summarizeImportValue(value, limit = 44) {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (raw.length <= limit) return raw;
  return `${raw.slice(0, limit - 3).trim()}...`;
}

function collectSuspiciousImportRows(records, mapping, options = {}) {
  const {
    defaultBuilding = null,
    overrideBuilding = false,
    maxExamples = 5,
  } = options;

  let count = 0;
  const examples = [];

  for (const record of records || []) {
    const values = {
      name: mapping.name ? record[mapping.name] : "",
      building: overrideBuilding ? (defaultBuilding || "") : (mapping.building ? record[mapping.building] : (defaultBuilding || "")),
      unit: mapping.unit ? record[mapping.unit] : "",
    };

    const flaggedFields = IMPORT_TRUNCATION_FIELDS
      .map((field) => getSuspiciousImportField(field, values[field.key]))
      .filter(Boolean);

    if (!flaggedFields.length) continue;

    count += 1;
    if (examples.length < maxExamples) {
      examples.push({
        rowNumber: record.__row || "?",
        flaggedFields,
      });
    }
  }

  return { count, examples };
}

function buildSuspiciousImportError(summary) {
  if (!summary?.count) return null;

  const exampleText = summary.examples
    .map((example) => {
      const fields = example.flaggedFields
        .map((field) => `${field.label} "${field.value}" (${field.reason})`)
        .join(", ");
      return `row ${example.rowNumber}: ${fields}`;
    })
    .join("; ");

  const remaining = summary.count - summary.examples.length;
  const remainingText = remaining > 0 ? ` (+${remaining} more)` : "";

  return `Import blocked: ${summary.count} row(s) contain building or unit values that cannot be trusted.${remainingText} ${exampleText} Fix the sheet values and re-import.`;
}

async function fetchImportCachedBuildings() {
  try {
    return await fetchCachedBuildings();
  } catch {
    return [];
  }
}

async function buildImportResult(allLeads, plan, options = {}) {
  const totalRows = allLeads.length;
  const cachedBuildings = options.cachedBuildings || [];
  return {
    count: plan.toInsert.length,
    matchedCount: plan.matchedCount,
    updatedCount: plan.updates.length,
    totalRows,
    skippedCount: plan.skippedDuplicateCount,
    quality: buildImportQualityReport(allLeads, plan.toInsert, { cachedBuildings }),
  };
}

async function fetchExistingLeadRows(userId, sourceId) {
  return selectAllRows(() => {
    let query = supabase
      .from("leads")
      .select("id, name, building, bedroom, unit, phone, status, last_contact")
      .eq("user_id", userId)
      .order("id");
    if (sourceId) query = query.eq("source_id", sourceId);
    else query = query.is("source_id", null);
    return query;
  });
}

const SYNC_UPDATE_CONCURRENCY = 10;

async function applyLeadFieldFills(userId, updates) {
  for (let index = 0; index < updates.length; index += SYNC_UPDATE_CONCURRENCY) {
    const batch = updates.slice(index, index + SYNC_UPDATE_CONCURRENCY);
    await Promise.all(batch.map(async ({ id, fields }) => {
      const { error } = await supabase
        .from("leads")
        .update(fields)
        .eq("user_id", userId)
        .eq("id", id);
      if (error) throw new Error(error.message);
    }));
  }
}

async function fetchSheetRows(rawSheetUrl) {
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

  return { mapping, records };
}

export async function previewSheetBuildings(rawSheetUrl) {
  const { mapping, records } = await fetchSheetRows(rawSheetUrl);
  if (!mapping.building) throw new Error("Could not find a building column in this sheet.");
  const groups = new Map();
  for (const record of records) {
    const building = String(record[mapping.building] || "").replace(/\s+/g, " ").trim();
    if (!building) continue;
    const current = groups.get(building) || { building, rows: 0, phones: new Set() };
    current.rows += 1;
    const phone = mapping.phone ? String(record[mapping.phone] || "").replace(/\D/g, "") : "";
    if (phone) current.phones.add(phone);
    groups.set(building, current);
  }
  return [...groups.values()]
    .map((item) => ({ building: item.building, rowCount: item.rows, uniquePhoneCount: item.phones.size }))
    .sort((left, right) => right.rowCount - left.rowCount || left.building.localeCompare(right.building));
}

async function insertLeadBatches(leads) {
  for (let index = 0; index < leads.length; index += IMPORT_BATCH_SIZE) {
    const batch = leads.slice(index, index + IMPORT_BATCH_SIZE);
    const { error } = await supabase.from("leads").insert(batch);
    if (error) throw new Error(error.message);
  }
}

export async function insertLead({ userId, sourceId, fields }) {
  if (!userId) throw new Error("Sign in required.");
  if (!sourceId) throw new Error("Pick a spreadsheet first.");

  const name = emptyToNull(fields?.name);
  const building = emptyBuildingToNull(fields?.building);
  const phone = emptyToNull(fields?.phone);

  if (!name && !building && !phone) {
    throw new Error("Enter a name, building, or phone at minimum.");
  }

  const payload = {
    user_id: userId,
    source_id: sourceId,
    name,
    building,
    bedroom: emptyToNull(fields?.bedroom),
    unit: emptyToNull(fields?.unit),
    phone,
    status: emptyToNull(fields?.status),
    last_contact: emptyToNull(fields?.lastContact),
  };

  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateLead({ userId, leadId, updates }) {
  if (!userId || !leadId) return;

  const payload = {};
  if (Object.prototype.hasOwnProperty.call(updates || {}, "name")) payload.name = emptyToNull(updates?.name);
  if (Object.prototype.hasOwnProperty.call(updates || {}, "building")) payload.building = emptyBuildingToNull(updates?.building);
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

// Imports MERGE into the app instead of replacing it: new sheet rows are
// inserted, rows matching an existing lead keep every piece of app state
// (status, notes, sent_at, follow-up cadence) and only fill empty fields,
// and nothing is ever deleted. The app DB is the master; sheets are seeds.
export async function replaceLegacyLeadsFromSheet({ userId, rawSheetUrl }) {
  const { mapping, records } = await fetchSheetRows(rawSheetUrl);
  const cachedBuildings = await fetchImportCachedBuildings();
  const resolveBuilding = createLeadBuildingResolver([], cachedBuildings);

  const suspiciousRows = collectSuspiciousImportRows(records, mapping);
  const suspiciousImportError = buildSuspiciousImportError(suspiciousRows);
  if (suspiciousImportError) throw new Error(suspiciousImportError);

  const incomingLeads = records
    .map((record) => createLeadInsertRecord(record, mapping, userId, {
      sourceId: null,
      defaultStatus: "Prospect",
      resolveBuilding,
    }))
    .filter(Boolean);

  if (!incomingLeads.length) throw new Error("No valid leads found in sheet.");

  const existingRows = await fetchExistingLeadRows(userId, null);
  const plan = buildLeadSyncPlan(existingRows, incomingLeads);
  await applyLeadFieldFills(userId, plan.updates);
  await insertLeadBatches(plan.toInsert);

  return buildImportResult(incomingLeads, plan, { cachedBuildings });
}

export async function replaceUserLeadsFromSheet({ userId, source, rawSheetUrl }) {
  const { mapping, records } = await fetchSheetRows(rawSheetUrl || source?.sheet_url);
  const selectedBuildings = Array.isArray(source?.selected_buildings) ? source.selected_buildings : [];
  const selectedBuildingSet = new Set(selectedBuildings);
  const importRecords = selectedBuildingSet.size && mapping.building
    ? records.filter((record) => selectedBuildingSet.has(String(record[mapping.building] || "").replace(/\s+/g, " ").trim()))
    : records;
  const cachedBuildings = await fetchImportCachedBuildings();
  const resolveBuilding = createLeadBuildingResolver([], cachedBuildings);

  const defaultStatus = "Prospect";
  const defaultBuilding = null;
  const overrideBuilding = false;
  const suspiciousRows = collectSuspiciousImportRows(importRecords, mapping, {
    defaultBuilding,
    overrideBuilding,
  });
  const suspiciousImportError = buildSuspiciousImportError(suspiciousRows);
  if (suspiciousImportError) throw new Error(suspiciousImportError);

  const sourceId = source?.id || null;
  if (!sourceId) throw new Error("Choose a spreadsheet source first.");

  const incomingLeads = importRecords
    .map((record) => createLeadInsertRecord(record, mapping, userId, {
      sourceId,
      defaultStatus,
      defaultBuilding,
      overrideBuilding,
      resolveBuilding,
    }))
    .filter(Boolean);

  if (!incomingLeads.length) throw new Error("No valid leads found in sheet.");

  const existingRows = await fetchExistingLeadRows(userId, sourceId);
  const plan = buildLeadSyncPlan(existingRows, incomingLeads);
  await applyLeadFieldFills(userId, plan.updates);
  await insertLeadBatches(plan.toInsert);

  return buildImportResult(incomingLeads, plan, { cachedBuildings });
}
