import { buildMessage } from "./insight-utils";
import { formatDateInputValue } from "./lead-utils";
import { fetchLeadSources } from "./services";
import { sellerLeadsQueryKey } from "./queryKeys";

const MAX_LEAD_SOURCES = 10;

export const LEGACY_SOURCE_ID = "legacy";
export const LEGACY_SOURCE_LABEL = "Legacy spreadsheet";
export const EMPTY_LEADS_DATA = { leads: [], sentMap: {} };
export const EMPTY_LEADS = [];
export const EMPTY_SOURCES = [];
export const EMPTY_SENT_MAP = {};

export function getErrorMessage(error) {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || "Unexpected error";
  if (typeof error?.message === "string") return error.message;
  return "Unexpected error";
}

function normalizeSources(sources) {
  if (!Array.isArray(sources)) return [];
  return sources.map((source) => ({
    ...source,
    type: "building",
  }));
}

function isVisibleSource(source) {
  return Boolean(String(source?.building_name || source?.label || source?.sheet_url || "").trim());
}

function limitLeadSources(sources) {
  if (!Array.isArray(sources)) return [];
  const normalized = normalizeSources(sources);
  return normalized
    .filter(isVisibleSource)
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
    .slice(0, MAX_LEAD_SOURCES);
}

export async function fetchSellerSources(userId) {
  const sources = await fetchLeadSources(userId);
  return limitLeadSources(sources);
}

export function buildInsightTarget(lead) {
  return {
    id: lead.id,
    name: lead.name || "",
    building: lead.building || "",
  };
}

export function buildLoadingInsights(targets) {
  const updates = {};
  for (const lead of targets) {
    updates[lead.id] = {
      status: "loading",
      error: null,
      message: buildMessage(lead, null),
    };
  }
  return updates;
}

export function buildErroredInsights(targets, message) {
  const updates = {};
  for (const lead of targets) {
    updates[lead.id] = {
      status: "error",
      error: message,
      message: buildMessage(lead, null),
    };
  }
  return updates;
}

export function updateLeadsCache(queryClient, userId, updater) {
  queryClient.setQueryData(sellerLeadsQueryKey(userId), (current) => updater(current || EMPTY_LEADS_DATA));
}

function isPlaceholderSourceLabel(source) {
  const label = String(source?.label || "").trim();
  return Boolean(label) && /^Spreadsheet\s+\d+$/i.test(label);
}

function getSourceName(source) {
  if (!source) return "";
  const buildingName = String(source.building_name || "").trim();
  const label = String(source.label || "").trim();
  if (buildingName && (!label || isPlaceholderSourceLabel(source))) return buildingName;
  return label || buildingName || "";
}

export function normalizeSourceDraft(source) {
  if (!source) return source;
  return {
    ...source,
    label: getSourceName(source),
    building_name: null,
  };
}

export function formatSourceLabel(source) {
  if (!source) return "";
  const label = getSourceName(source);
  return label || `Spreadsheet ${Number(source.sort_order ?? 0) + 1}`;
}

export function formatImportSuccessMessage(label, result) {
  const count = Number(result?.count || 0);
  const skippedCount = Number(result?.skippedCount || 0);
  const countText = `${count} lead${count === 1 ? "" : "s"}`;
  const skippedText = `${skippedCount} duplicate row${skippedCount === 1 ? "" : "s"}`;

  if (skippedCount > 0) {
    return label
      ? `Imported ${countText} from ${label}. Skipped ${skippedText} from the sheet.`
      : `Imported ${countText}. Skipped ${skippedText} from the sheet.`;
  }

  return label ? `Imported ${countText} from ${label}.` : `Imported ${countText}.`;
}

export function formatImportErrorMessage(label, message) {
  return label ? `Import failed for ${label}: ${message}` : `Import failed: ${message}`;
}

export function createLeadEditDraft(lead) {
  if (!lead) return null;
  return {
    name: lead.name || "",
    building: lead.building || "",
    bedroom: lead.bedroom || "",
    unit: lead.unit || "",
    phone: lead.phone || "",
    status: lead.status || "",
    lastContact: formatDateInputValue(lead.lastContactRaw || lead.lastContactDate),
  };
}
