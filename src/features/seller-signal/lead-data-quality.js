import { getKnownBuildingMatch, normalizeBuildingAliasKey } from "./building-utils";
import { normalizeToken } from "./spreadsheet";

const REVIEW_ISSUES = new Set([
  "duplicate_lead",
  "missing_building",
  "unmatched_building",
]);

function normalizePhone(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function buildAliasLookup(buildingAliases) {
  const lookup = new Map();

  for (const alias of buildingAliases || []) {
    const aliasName = alias.aliasName ?? alias.alias_name;
    const canonicalName = String(alias.canonicalName ?? alias.canonical_name ?? "").trim();
    const key = normalizeBuildingAliasKey(aliasName);
    if (key && canonicalName) lookup.set(key, canonicalName);
  }

  return lookup;
}

function resolveBuildingMatch(raw, aliasLookup) {
  const baselineMatch = getKnownBuildingMatch(raw);
  if (baselineMatch.status === "missing") return baselineMatch;

  const aliasCanonical = aliasLookup.get(normalizeBuildingAliasKey(baselineMatch.inputName || raw));
  if (aliasCanonical) {
    return {
      status: "matched",
      confidence: "high",
      method: "custom_alias",
      inputName: baselineMatch.inputName || String(raw || "").trim(),
      canonicalName: aliasCanonical,
    };
  }

  return baselineMatch;
}

function buildDuplicateKey(lead, aliasLookup) {
  const buildingMatch = resolveBuildingMatch(lead.building, aliasLookup);
  const building = normalizeToken(buildingMatch.canonicalName || lead.building);
  const unit = normalizeToken(lead.unit);
  const phone = normalizePhone(lead.phone);
  const name = normalizeToken(lead.name);
  const bedroom = normalizeToken(lead.bedroom);

  if (phone && building && unit) return `phone:${phone}:${building}:${unit}`;
  if (name && building && unit) return `unit:${name}:${building}:${unit}`;
  if (name && phone && building && bedroom) return `contact:${name}:${phone}:${building}:${bedroom}`;
  return "";
}

function buildDuplicateLookup(leads, aliasLookup) {
  const groups = new Map();

  for (const lead of leads || []) {
    const key = buildDuplicateKey(lead, aliasLookup);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(lead.id);
  }

  const lookup = {};
  for (const [key, ids] of groups.entries()) {
    if (ids.length < 2) continue;
    for (const id of ids) lookup[id] = { key, count: ids.length, ids };
  }

  return lookup;
}

function addIssue(issues, id, label, severity = "warning") {
  issues.push({ id, label, severity });
}

function buildQualityLabel(issues) {
  if (issues.some((issue) => REVIEW_ISSUES.has(issue.id))) return "Needs review";
  if (issues.length) return "Partial";
  return "Trusted";
}

function buildQualityLevel(label) {
  if (label === "Trusted") return "trusted";
  if (label === "Partial") return "partial";
  return "review";
}

export function enrichLeadsWithDataQuality(leads, buildingAliases = []) {
  const aliasLookup = buildAliasLookup(buildingAliases);
  const duplicateLookup = buildDuplicateLookup(leads, aliasLookup);

  return (leads || []).map((lead) => {
    const buildingMatch = resolveBuildingMatch(lead.building, aliasLookup);
    const issues = [];

    if (!lead.sourceId) addIssue(issues, "legacy_source", "Legacy source");
    if (!String(lead.name || "").trim()) addIssue(issues, "missing_name", "Missing name");
    if (!String(lead.phone || "").trim()) addIssue(issues, "missing_phone", "Missing phone");
    if (!String(lead.unit || "").trim()) addIssue(issues, "missing_unit", "Missing unit");
    if (buildingMatch.status === "missing") addIssue(issues, "missing_building", "Missing building", "error");
    if (buildingMatch.status === "unmatched") addIssue(issues, "unmatched_building", "Unmatched building", "error");
    if (duplicateLookup[lead.id]) addIssue(issues, "duplicate_lead", `${duplicateLookup[lead.id].count} duplicates`, "error");

    const label = buildQualityLabel(issues);
    return {
      ...lead,
      buildingMatch,
      resolvedBuilding: buildingMatch.canonicalName || lead.building || "",
      dataQuality: {
        label,
        level: buildQualityLevel(label),
        issues,
        duplicate: duplicateLookup[lead.id] || null,
      },
    };
  });
}

export function summarizeLeadDataQuality(leads) {
  const summary = { trusted: 0, partial: 0, review: 0 };
  for (const lead of leads || []) {
    const level = lead.dataQuality?.level || "review";
    summary[level] = (summary[level] || 0) + 1;
  }
  return summary;
}

export function summarizeUnmatchedBuildings(leads) {
  const groups = new Map();

  for (const lead of leads || []) {
    const match = lead.buildingMatch || getKnownBuildingMatch(lead.building);
    if (match.status !== "unmatched") continue;

    const name = match.inputName || lead.building || "Unknown";
    const key = normalizeBuildingAliasKey(name) || name.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name,
        count: 0,
        leadIds: [],
      });
    }

    const group = groups.get(key);
    group.count += 1;
    group.leadIds.push(lead.id);
  }

  return [...groups.values()].sort((left, right) =>
    right.count - left.count || left.name.localeCompare(right.name),
  );
}
