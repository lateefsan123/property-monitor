import { unidentifiedText } from "./page-helpers";
import { fetchLeadSources } from "./services";

export const MAX_LEAD_SOURCES = 10;
export const LEGACY_SOURCE_ID = "legacy";
export const EMPTY_LEADS = [];
export const EMPTY_SOURCES = [];

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

export function formatImportNotice(source, result) {
  const label = formatSourceLabel(source);
  const count = Number(result?.count || 0);
  const matched = Number(result?.matchedCount || 0);
  const skipped = Number(result?.skippedCount || 0);
  return `Imported ${count.toLocaleString()} seller${count === 1 ? "" : "s"}${label ? ` from ${label}` : ""}.`
    + (matched ? ` ${matched.toLocaleString()} already saved.` : "")
    + (skipped ? ` Skipped ${skipped.toLocaleString()} duplicate rows.` : "")
    + unidentifiedText(result);
}

export function sellerLeadsQueryKey(userId) {
  return ["seller-signal", "leads", userId];
}

export function sellerSourcesQueryKey(userId) {
  return ["seller-signal", "sources", userId];
}

export function sellerInsightsQueryPrefix(userId) {
  return ["seller-signal", "insights", userId];
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
  return normalizeSources(sources)
    .filter(isVisibleSource)
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
    .slice(0, MAX_LEAD_SOURCES);
}

export function getNextLeadSourceSortOrder(sources) {
  if (!Array.isArray(sources) || !sources.length) return 0;
  return sources.reduce((max, source) => Math.max(max, Number(source.sort_order ?? -1)), -1) + 1;
}

export async function fetchSellerSources(userId) {
  const sources = await fetchLeadSources(userId);
  return limitLeadSources(sources);
}
