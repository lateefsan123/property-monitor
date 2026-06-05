import {
  cleanBuildingName,
  findKnownBuildingProjectPrefixMatch,
  findKnownShortUniquePrefixMatch,
  findUniqueKnownBuildingPrefixMatch,
  getKnownBuildingMatch,
  getTruncatedBuildingPrefix,
  hasSafeTruncatedBuildingPrefix,
  normalizeBuildingAliasKey,
  normalizeBuildingPrefixKey,
  parseBuildingAddressValue,
} from "./building-utils";
import { normalizeToken } from "./spreadsheet";

const REVIEW_ISSUES = new Set([
  "duplicate_lead",
  "invalid_building",
  "missing_building",
  "unmatched_building",
]);
const CACHED_BUILDING_STOP_WORDS = new Set([
  "the",
  "tower",
  "towers",
  "residence",
  "residences",
  "building",
  "buildings",
  "apartment",
  "apartments",
  "project",
]);
const TRUNCATED_BUILDING_PATTERN = /\u2026|\.{3,}/;
const MAX_UNMATCHED_BUILDING_EXAMPLES = 3;
const NON_BUILDING_STATUS_VALUES = new Set([
  "active",
  "done",
  "marketappraisal",
  "notinterested",
  "prospect",
  "sent",
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

function tokenizeBuildingName(value) {
  return cleanBuildingName(value)
    .toLowerCase()
    .replace(/\b(t)(\d+)\b/g, " tower $2")
    .replace(/\btower(\d+)\b/g, " tower $1")
    .replace(/\bii\b/g, "2")
    .replace(/\biii\b/g, "3")
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token && !CACHED_BUILDING_STOP_WORDS.has(token));
}

function countTokenOverlap(leftTokens, rightTokens) {
  const right = new Set(rightTokens);
  let count = 0;
  for (const token of leftTokens) {
    if (right.has(token)) count += 1;
  }
  return count;
}

export function getInvalidBuildingValueIssue(raw) {
  const original = String(raw || "").replace(/\s+/g, " ").trim();
  if (!original) return null;

  const cleaned = cleanBuildingName(original);
  const normalized = normalizeToken(cleaned);
  const letters = cleaned.replace(/[^a-z]/gi, "");
  const digits = cleaned.replace(/[^0-9]/g, "");

  if (!letters && digits.length >= 7) {
    return {
      id: "numeric_building",
      label: "Building value looks like a phone number or ID",
    };
  }

  if (/@|https?:\/\/|wa\.me|whatsapp/i.test(original)) {
    return {
      id: "contact_building",
      label: "Building value looks like contact info",
    };
  }

  if (NON_BUILDING_STATUS_VALUES.has(normalized)) {
    return {
      id: "status_building",
      label: "Building value looks like a lead status",
    };
  }

  return null;
}

function toCachedBuildingCandidate(row) {
  const rawKey = String(row?.key || "").trim();
  const rawSearchName = String(row?.search_name || "").trim();
  const displayNames = [
    rawSearchName,
    row?.location_name,
  ]
    .map((value) => String(value || "").trim())
    .filter((value) => value && value !== "0" && !TRUNCATED_BUILDING_PATTERN.test(value));
  const names = [
    ...displayNames,
    rawKey,
  ].filter((value) => value && value !== "0");

  const canonicalName = displayNames.find((value) => /[a-z]/i.test(value)) || "";
  const tokens = [...new Set(names.flatMap(tokenizeBuildingName))];
  if (!canonicalName || !tokens.length) return null;

  const truncatedInputKeys = TRUNCATED_BUILDING_PATTERN.test(rawSearchName)
    ? [
      rawKey,
      getTruncatedBuildingPrefix(rawSearchName),
    ].map(normalizeBuildingPrefixKey).filter(Boolean)
    : [];

  return {
    canonicalName,
    normalizedNames: names.map(normalizeBuildingAliasKey).filter(Boolean),
    prefixKeys: names.map(normalizeBuildingPrefixKey).filter(Boolean),
    truncatedInputKeys,
    tokens,
  };
}

function buildCachedBuildingIndex(cachedBuildings) {
  const exact = new Map();
  const truncatedExact = new Map();
  const candidates = [];

  for (const row of cachedBuildings || []) {
    const candidate = toCachedBuildingCandidate(row);
    if (!candidate) continue;
    candidates.push(candidate);
    for (const key of candidate.normalizedNames) {
      if (!exact.has(key)) exact.set(key, candidate.canonicalName);
    }
    for (const key of candidate.truncatedInputKeys) {
      if (!truncatedExact.has(key)) truncatedExact.set(key, new Map());
      truncatedExact.get(key).set(candidate.canonicalName, candidate);
    }
  }

  return { exact, truncatedExact, candidates };
}

function findCachedBuildingMatch(raw, cachedIndex) {
  const cleaned = cleanBuildingName(raw);
  const exactMatch = cachedIndex.exact.get(normalizeBuildingAliasKey(cleaned));
  if (exactMatch) {
    return {
      status: "matched",
      confidence: "high",
      method: "cached_exact",
      inputName: cleaned,
      canonicalName: exactMatch,
    };
  }

  const inputTokens = [...new Set(tokenizeBuildingName(cleaned))];
  if (!inputTokens.length) return null;

  let best = null;
  for (const candidate of cachedIndex.candidates) {
    const overlap = countTokenOverlap(inputTokens, candidate.tokens);
    if (!overlap) continue;

    const inputCoverage = overlap / inputTokens.length;
    const candidateCoverage = overlap / candidate.tokens.length;
    const isSingleTokenMatch = inputTokens.length === 1 && inputTokens[0].length >= 4 && candidate.tokens.includes(inputTokens[0]);
    const isDistinctCachedNameContained = candidate.tokens.length === 1
      && candidate.tokens[0].length >= 4
      && inputTokens.includes(candidate.tokens[0]);
    const isStrongMatch = overlap >= 2 && inputCoverage >= 0.67 && candidateCoverage >= 0.5;
    if (!isSingleTokenMatch && !isDistinctCachedNameContained && !isStrongMatch) continue;

    const score = overlap * 100
      + inputCoverage * 20
      + candidateCoverage * 10
      - Math.abs(candidate.tokens.length - inputTokens.length);
    if (!best || score > best.score) best = { candidate, score };
  }

  if (!best) return null;

  return {
    status: "matched",
    confidence: best.candidate.tokens.length === inputTokens.length ? "high" : "medium",
    method: "cached_fuzzy",
    inputName: cleaned,
    canonicalName: best.candidate.canonicalName,
  };
}

function collectCachedBuildingPrefixMatches(raw, cachedIndex) {
  if (!hasSafeTruncatedBuildingPrefix(raw)) return null;

  const prefix = getTruncatedBuildingPrefix(raw);
  const prefixKey = normalizeBuildingPrefixKey(prefix);
  if (!prefixKey) return null;

  const matches = new Map();
  for (const candidate of cachedIndex.candidates) {
    if (candidate.prefixKeys.some((key) => key.startsWith(prefixKey))) {
      matches.set(candidate.canonicalName, candidate);
    }
  }

  return { prefix, matches };
}

function findCachedBuildingPrefixMatch(raw, cachedIndex) {
  const result = collectCachedBuildingPrefixMatches(raw, cachedIndex);
  if (!result || result.matches.size !== 1) return null;

  const { prefix, matches } = result;
  const [canonicalName] = matches.keys();
  return {
    status: "matched",
    confidence: "medium",
    method: "truncated_prefix_cached",
    inputName: prefix,
    canonicalName,
  };
}

function findCachedResolvedTruncatedInputMatch(raw, cachedIndex) {
  const prefix = getTruncatedBuildingPrefix(raw);
  const prefixKey = normalizeBuildingPrefixKey(prefix);
  if (!prefixKey) return null;

  const matches = cachedIndex.truncatedExact.get(prefixKey);
  if (!matches || matches.size !== 1) return null;

  const [canonicalName] = matches.keys();
  return {
    status: "matched",
    confidence: "medium",
    method: "truncated_cache_resolved",
    inputName: prefix,
    canonicalName,
  };
}

function isEquivalentCanonicalName(left, right) {
  const leftKey = normalizeBuildingPrefixKey(left);
  const rightKey = normalizeBuildingPrefixKey(right);
  return Boolean(leftKey && rightKey)
    && (leftKey === rightKey || leftKey.startsWith(rightKey) || rightKey.startsWith(leftKey));
}

function findTruncatedPrefixMatch(raw, cachedIndex) {
  const knownMatch = findUniqueKnownBuildingPrefixMatch(raw);
  const projectMatch = findKnownBuildingProjectPrefixMatch(raw);
  const shortKnownMatch = findKnownShortUniquePrefixMatch(raw);
  const cachedResolvedMatch = findCachedResolvedTruncatedInputMatch(raw, cachedIndex);
  const cachedResult = collectCachedBuildingPrefixMatches(raw, cachedIndex);

  if (knownMatch) {
    if (!cachedResult || cachedResult.matches.size === 0) return knownMatch;
    const cacheCandidates = [...cachedResult.matches.keys()];
    const hasConflict = cacheCandidates.some((candidate) => !isEquivalentCanonicalName(candidate, knownMatch.canonicalName));
    return hasConflict ? null : knownMatch;
  }

  if (projectMatch) {
    if (!cachedResult || cachedResult.matches.size === 0) return projectMatch;
    const cacheCandidates = [...cachedResult.matches.keys()];
    const hasConflict = cacheCandidates.some((candidate) => !isEquivalentCanonicalName(candidate, projectMatch.canonicalName));
    return hasConflict ? null : projectMatch;
  }

  if (shortKnownMatch) {
    if (!cachedResult || cachedResult.matches.size === 0) return shortKnownMatch;
    const cacheCandidates = [...cachedResult.matches.keys()];
    const hasConflict = cacheCandidates.some((candidate) => !isEquivalentCanonicalName(candidate, shortKnownMatch.canonicalName));
    return hasConflict ? null : shortKnownMatch;
  }

  if (cachedResolvedMatch) return cachedResolvedMatch;

  if (!cachedResult || cachedResult.matches.size !== 1) return null;
  return findCachedBuildingPrefixMatch(raw, cachedIndex);
}

function resolveBuildingMatch(raw, aliasLookup, cachedIndex) {
  const invalidIssue = getInvalidBuildingValueIssue(raw);
  if (invalidIssue) {
    return {
      status: "invalid",
      confidence: "none",
      method: invalidIssue.id,
      inputName: cleanBuildingName(raw),
      canonicalName: "",
      issue: invalidIssue,
    };
  }

  const baselineMatch = getKnownBuildingMatch(raw);
  if (baselineMatch.status === "missing") return baselineMatch;
  const addressParts = parseBuildingAddressValue(raw);
  const hasTruncation = TRUNCATED_BUILDING_PATTERN.test(String(raw || "")) || TRUNCATED_BUILDING_PATTERN.test(baselineMatch.inputName || "");
  const canRecoverTruncatedAddress = hasTruncation
    && addressParts.recoverableTruncation
    && !TRUNCATED_BUILDING_PATTERN.test(baselineMatch.inputName || "");
  if (hasTruncation && !canRecoverTruncatedAddress) {
    const prefixMatch = findTruncatedPrefixMatch(raw, cachedIndex);
    if (prefixMatch) return prefixMatch;

    return {
      status: "unmatched",
      confidence: "low",
      method: "truncated",
      inputName: baselineMatch.inputName || cleanBuildingName(raw),
      canonicalName: "",
    };
  }

  const aliasCanonical = aliasLookup.get(normalizeBuildingAliasKey(baselineMatch.inputName || raw));
  if (aliasCanonical) {
    return {
      status: "matched",
      confidence: "high",
      method: canRecoverTruncatedAddress ? "truncated_address_alias" : "custom_alias",
      inputName: baselineMatch.inputName || String(raw || "").trim(),
      canonicalName: aliasCanonical,
    };
  }

  if (baselineMatch.status !== "matched") {
    const cachedMatch = findCachedBuildingMatch(baselineMatch.inputName || raw, cachedIndex);
    if (cachedMatch) {
      return canRecoverTruncatedAddress
        ? { ...cachedMatch, method: "truncated_address_cached" }
        : cachedMatch;
    }
  }

  if (canRecoverTruncatedAddress && baselineMatch.status === "matched") {
    return {
      ...baselineMatch,
      method: "truncated_address",
    };
  }

  return baselineMatch;
}

export function createLeadBuildingResolver(buildingAliases = [], cachedBuildings = []) {
  const aliasLookup = buildAliasLookup(buildingAliases);
  const cachedIndex = buildCachedBuildingIndex(cachedBuildings);
  return (raw) => resolveBuildingMatch(raw, aliasLookup, cachedIndex);
}

function buildDuplicateKey(lead, aliasLookup, cachedIndex) {
  const buildingMatch = resolveBuildingMatch(lead.building, aliasLookup, cachedIndex);
  const building = normalizeToken(buildingMatch.canonicalName || lead.building);
  const addressParts = parseBuildingAddressValue(lead.building);
  const unit = normalizeToken(lead.unit || (addressParts.unit ? `Unit ${addressParts.unit}` : ""));
  const phone = normalizePhone(lead.phone);
  const name = normalizeToken(lead.name);
  const bedroom = normalizeToken(lead.bedroom);

  if (phone && building && unit) return `phone:${phone}:${building}:${unit}`;
  if (name && building && unit) return `unit:${name}:${building}:${unit}`;
  if (name && phone && building && bedroom) return `contact:${name}:${phone}:${building}:${bedroom}`;
  return "";
}

function buildDuplicateLookup(leads, aliasLookup, cachedIndex) {
  const groups = new Map();

  for (const lead of leads || []) {
    const key = buildDuplicateKey(lead, aliasLookup, cachedIndex);
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
  if (issues.length) return "Missing info";
  return "Complete";
}

function buildQualityLevel(label) {
  if (label === "Complete" || label === "Trusted") return "trusted";
  if (label === "Missing info" || label === "Partial") return "partial";
  return "review";
}

export function enrichLeadsWithDataQuality(leads, buildingAliases = [], cachedBuildings = []) {
  const aliasLookup = buildAliasLookup(buildingAliases);
  const cachedIndex = buildCachedBuildingIndex(cachedBuildings);
  const duplicateLookup = buildDuplicateLookup(leads, aliasLookup, cachedIndex);

  return (leads || []).map((lead) => {
    const buildingMatch = resolveBuildingMatch(lead.building, aliasLookup, cachedIndex);
    const addressParts = parseBuildingAddressValue(lead.building);
    const leadUnit = lead.unit || (addressParts.unit ? `Unit ${addressParts.unit}` : "");
    const issues = [];

    if (!lead.sourceId) addIssue(issues, "legacy_source", "Legacy source");
    if (!String(lead.name || "").trim()) addIssue(issues, "missing_name", "Missing name");
    if (!String(lead.phone || "").trim()) addIssue(issues, "missing_phone", "Missing phone");
    if (!String(leadUnit || "").trim()) addIssue(issues, "missing_unit", "Missing unit");
    if (buildingMatch.status === "missing") addIssue(issues, "missing_building", "Missing building", "error");
    if (buildingMatch.status === "invalid") addIssue(issues, "invalid_building", buildingMatch.issue?.label || "Invalid building value", "error");
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
        examples: [],
      });
    }

    const group = groups.get(key);
    group.count += 1;
    group.leadIds.push(lead.id);
    if (group.examples.length < MAX_UNMATCHED_BUILDING_EXAMPLES) {
      group.examples.push({
        id: lead.id,
        name: lead.name || "",
        unit: lead.unit || "",
        bedroom: lead.bedroom || "",
        building: lead.building || "",
      });
    }
  }

  return [...groups.values()].sort((left, right) =>
    right.count - left.count || left.name.localeCompare(right.name),
  );
}
