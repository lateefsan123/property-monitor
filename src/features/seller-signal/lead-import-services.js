import { collectSuspiciousImportRows, buildSuspiciousImportError } from "./import-validation";
import { supabase } from "../../supabase";
import { saveImportBatches } from "./import-batches.js";
import { prepareImportRows, validateImportMapping } from "./import-preview.js";
import { UserFacingError } from "../../../shared/user-facing-errors.js";
import { canonicalizeBuildingName } from "./building-utils";
import { fetchCachedBuildings } from "./building-cache-services";
import { createLeadBuildingResolver, getInvalidBuildingValueIssue } from "./lead-data-quality";
import { prepareImportLeads } from "./prepare-import-leads.js";
import { selectAllRows } from "./lead-record-services";
import { buildLeadSyncPlan } from "./lead-sync-plan";
import { buildImportQualityReport } from "./import-quality-report";
import { buildGoogleCsvUrl, parseCsvText } from "./spreadsheet";

function emptyToNull(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function emptyBuildingToNull(value) {
  const invalidIssue = getInvalidBuildingValueIssue(value);
  if (invalidIssue) throw new UserFacingError(invalidIssue.label);
  const canonical = canonicalizeBuildingName(value);
  return canonical || null;
}

async function fetchImportCachedBuildings() {
  try {
    return await fetchCachedBuildings();
  } catch {
    return [];
  }
}

async function buildImportResult(allLeads, plan, options = {}) {
  const totalRows = options.totalRows ?? allLeads.length;
  const cachedBuildings = options.cachedBuildings || [];
  return {
    count: options.saved ? options.saved.inserted : plan.toInsert.length,
    failedCount: options.saved?.failed || 0,
    failedRows: options.saved?.failedRows || [],
    matchedCount: plan.matchedCount,
    updatedCount: plan.updates.length,
    totalRows,
    skippedCount: plan.skippedDuplicateCount,
    unidentifiedCount: plan.unidentifiedCount + totalRows - allLeads.length,
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
      let query = supabase
        .from("leads")
        .update(fields)
        .eq("user_id", userId)
        .eq("id", id);
      // A user may edit a seller while a large import is running. Only fill
      // fields that are still empty when the update actually reaches the DB.
      for (const field of Object.keys(fields)) {
        query = field === 'last_contact' ? query.is(field, null) : query.or(`${field}.is.null,${field}.eq.`);
      }
      const { error } = await query;
      if (error) throw new Error(error.message);
    }));
  }
}

async function fetchSheetRows(rawSheetUrl, options) {
  return mapImportRows(await readPublicSheetRows(rawSheetUrl), options);
}

function mapImportRows(rawRows, options = {}) {
  const { headers, records, mapping: inferred } = prepareImportRows(rawRows, options);
  const mapping = options.mapping || inferred;
  validateImportMapping(headers, mapping);
  return { mapping, records };
}

export async function readPublicSheetRows(rawSheetUrl) {
  const csvUrl = buildGoogleCsvUrl(String(rawSheetUrl || "").trim());
  if (!csvUrl) throw new UserFacingError("Paste a valid Google Sheet link first.");
  let response;
  try { response = await fetch(csvUrl, { signal: AbortSignal.timeout(30000) }); }
  catch { throw new UserFacingError("We couldn’t read this sheet. Check your connection and that the sheet is shared as Anyone with the link."); }
  if (!response.ok) throw new UserFacingError("We couldn’t open this sheet. Check that it is shared as Anyone with the link, or connect your Google account.");
  const text = await response.text();
  if (/^\s*</.test(text)) throw new UserFacingError("This link opened a web page instead of a spreadsheet. Check the sharing settings or import a file.");
  return parseCsvText(text);
}

// The sheet's buildings with row and phone counts, for the optional building
// picker; totalRows counts every row, with or without a building.
export async function previewSheetBuildings(rawSheetUrl) {
  const rawRows = await readPublicSheetRows(rawSheetUrl);
  const { mapping, records } = prepareImportRows(rawRows);
  const totalRows = records.length;
  if (!mapping.building) return { buildings: [], totalRows, rawRows };
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
  const buildings = [...groups.values()]
    .map((item) => ({ building: item.building, rowCount: item.rows, uniquePhoneCount: item.phones.size }))
    .sort((left, right) => right.rowCount - left.rowCount || left.building.localeCompare(right.building));
  return { buildings, totalRows, rawRows };
}

function insertLeadBatches(leads, onProgress) {
  return saveImportBatches(leads, {
    onProgress,
    write: rows => supabase.from("leads").upsert(rows, { onConflict: "user_id,import_key", ignoreDuplicates: true }).abortSignal(AbortSignal.timeout(30000)),
  });
}

export async function insertLead({ userId, sourceId, fields }) {
  if (!userId) throw new UserFacingError("Sign in required.");
  if (!sourceId) throw new UserFacingError("Pick a spreadsheet first.");

  const name = emptyToNull(fields?.name);
  const building = emptyBuildingToNull(fields?.building);
  const phone = emptyToNull(fields?.phone);

  if (!name && !building && !phone) {
    throw new UserFacingError("Enter a name, building, or phone at minimum.");
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

  if (Object.prototype.hasOwnProperty.call(updates || {}, "message_draft")) payload.message_draft = updates.message_draft;

  if (!Object.keys(payload).length) return;

  const query = supabase.from("leads").update(payload).eq("user_id", userId).eq("id", leadId);
  const { error } = await (Object.prototype.hasOwnProperty.call(payload, "message_draft") ? query.select("id").single() : query);

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
  if (suspiciousImportError) throw new UserFacingError(suspiciousImportError);

  const incomingLeads = await prepareImportLeads(records, mapping, userId, {
      sourceId: null,
      defaultStatus: "Prospect",
      resolveBuilding,
    });

  if (!incomingLeads.length) throw new UserFacingError("No valid leads found in sheet.");

  const existingRows = await fetchExistingLeadRows(userId, null);
  const plan = buildLeadSyncPlan(existingRows, incomingLeads);
  await applyLeadFieldFills(userId, plan.updates);
  const saved = await insertLeadBatches(plan.toInsert);

  return buildImportResult(incomingLeads, plan, { cachedBuildings, saved, totalRows: records.length });
}

export async function replaceUserLeadsFromSheet({ userId, source, rawSheetUrl }) {
  const { mapping, records } = await fetchSheetRows(rawSheetUrl || source?.sheet_url, source?.import_options || {});
  return importUserLeadRecords({ userId, source, mapping, records });
}

export async function replaceUserLeadsFromRows({ userId, source, rawRows, mapping: selectedMapping, headerRowIndex, onProgress }) {
  const { mapping, records } = mapImportRows(rawRows, { mapping: selectedMapping, headerRowIndex });
  return importUserLeadRecords({ userId, source, mapping, records, onProgress });
}

async function importUserLeadRecords({ userId, source, mapping, records, onProgress }) {
  if (!userId) throw new UserFacingError("Sign in required.");
  if (source?.user_id !== userId) throw new UserFacingError("Choose a spreadsheet owned by your account.");
  const selectedBuildings = Array.isArray(source?.selected_buildings) ? source.selected_buildings : [];
  const selectedBuildingSet = new Set(selectedBuildings);
  if (selectedBuildingSet.size && !mapping.building) throw new UserFacingError("Choose a building column to import the selected buildings.");
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
  if (suspiciousImportError) throw new UserFacingError(suspiciousImportError);

  const sourceId = source?.id || null;
  if (!sourceId) throw new UserFacingError("Choose a spreadsheet source first.");

  const incomingLeads = await prepareImportLeads(importRecords, mapping, userId, {
      sourceId,
      defaultStatus,
      defaultBuilding,
      overrideBuilding,
      resolveBuilding,
    });

  if (!incomingLeads.length) throw new UserFacingError("No valid leads found in sheet.");

  const existingRows = await fetchExistingLeadRows(userId, sourceId);
  const plan = buildLeadSyncPlan(existingRows, incomingLeads);
  await applyLeadFieldFills(userId, plan.updates);
  const saved = await insertLeadBatches(plan.toInsert, onProgress);

  return buildImportResult(incomingLeads, plan, { cachedBuildings, saved, totalRows: importRecords.length });
}
