import { aiMapColumns } from "../../ai-mapper";
import { supabase } from "../../supabase";
import { IMPORT_BATCH_SIZE, IMPORT_SAMPLE_ROW_LIMIT } from "./constants";
import { canonicalizeBuildingName, cleanBuildingName } from "./building-utils";
import { createLeadInsertRecord } from "./lead-utils";
import { clearLeadsForSource } from "./lead-source-services";
import { buildGoogleCsvUrl, inferMapping, normalizeToken, parseCsvText, rowsToObjects } from "./spreadsheet";

const IMPORT_TRUNCATION_PATTERN = /\u2026|\.{3,}/;
const IMPORT_TRUNCATION_FIELDS = [
  { key: "name", label: "name" },
  { key: "building", label: "building" },
  { key: "unit", label: "unit" },
];

function emptyToNull(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function emptyBuildingToNull(value) {
  const canonical = canonicalizeBuildingName(value);
  return canonical || null;
}

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
      .map((field) => {
        const value = values[field.key];
        if (!containsImportTruncation(value)) return null;
        return {
          label: field.label,
          value: summarizeImportValue(value),
        };
      })
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
        .map((field) => `${field.label} "${field.value}"`)
        .join(", ");
      return `row ${example.rowNumber}: ${fields}`;
    })
    .join("; ");

  const remaining = summary.count - summary.examples.length;
  const remainingText = remaining > 0 ? ` (+${remaining} more)` : "";

  return `Import blocked: ${summary.count} row(s) contain possible truncation markers.${remainingText} ${exampleText} Fix the sheet values and re-import.`;
}

function normalizePhoneKey(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function buildLeadStateKey(lead, sourceId = null) {
  return [
    sourceId ?? lead?.source_id ?? "legacy",
    normalizeToken(lead?.name),
    normalizeToken(canonicalizeBuildingName(lead?.building) || cleanBuildingName(lead?.building)),
    normalizeToken(lead?.unit),
    normalizeToken(lead?.bedroom),
    normalizePhoneKey(lead?.phone),
  ].join(":");
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

function buildImportResult(allLeads, newLeads) {
  const totalRows = allLeads.length;
  const count = newLeads.length;
  return {
    count,
    totalRows,
    skippedCount: Math.max(totalRows - count, 0),
  };
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

async function clearLegacyLeads(userId) {
  const { error: leadDeleteError } = await supabase
    .from("leads")
    .delete()
    .eq("user_id", userId)
    .is("source_id", null);
  if (leadDeleteError) throw new Error(leadDeleteError.message);
}

export async function replaceLegacyLeadsFromSheet({ userId, rawSheetUrl }) {
  const { mapping, records } = await fetchSheetRows(rawSheetUrl);

  const suspiciousRows = collectSuspiciousImportRows(records, mapping);
  const suspiciousImportError = buildSuspiciousImportError(suspiciousRows);
  if (suspiciousImportError) throw new Error(suspiciousImportError);

  const leadsToInsert = records
    .map((record) => createLeadInsertRecord(record, mapping, userId, {
      sourceId: null,
      defaultStatus: "Prospect",
    }))
    .filter(Boolean);

  if (!leadsToInsert.length) throw new Error("No valid leads found in sheet.");

  const nextLeads = dedupeIncomingLeads(leadsToInsert, null);
  await clearLegacyLeads(userId);
  await insertLeadBatches(nextLeads);

  return buildImportResult(leadsToInsert, nextLeads);
}

export async function replaceUserLeadsFromSheet({ userId, source, rawSheetUrl }) {
  const { mapping, records } = await fetchSheetRows(rawSheetUrl || source?.sheet_url);

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
  if (!sourceId) throw new Error("Choose a spreadsheet source first.");

  const nextLeads = dedupeIncomingLeads(leadsToInsert, sourceId);
  await clearLeadsForSource(userId, sourceId);
  await insertLeadBatches(nextLeads);

  return buildImportResult(leadsToInsert, nextLeads);
}
