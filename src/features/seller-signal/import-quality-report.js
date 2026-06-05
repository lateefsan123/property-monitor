import { normalizeBuildingAliasKey } from "./building-utils";
import { createLeadBuildingResolver } from "./lead-data-quality";

function countMissing(leads, field) {
  return (leads || []).filter((lead) => !String(lead?.[field] || "").trim()).length;
}

function collectUnmatchedBuildings(leads, options = {}) {
  const resolveBuilding = createLeadBuildingResolver(options.buildingAliases, options.cachedBuildings);
  const counts = new Map();
  const methodCounts = {};
  let missing = 0;
  let matched = 0;
  let cached = 0;
  let customAlias = 0;

  for (const lead of leads || []) {
    const match = resolveBuilding(lead.building);
    if (match.status === "matched") {
      matched += 1;
      const method = match.method || "matched";
      methodCounts[method] = (methodCounts[method] || 0) + 1;
      if (method.startsWith("cached_")) cached += 1;
      if (method === "custom_alias") customAlias += 1;
      continue;
    }
    if (match.status === "missing") {
      missing += 1;
      continue;
    }
    const name = match.inputName || lead.building || "Unknown";
    const key = normalizeBuildingAliasKey(name) || name.toLowerCase();
    const existing = counts.get(key) || { name, count: 0 };
    existing.count += 1;
    counts.set(key, existing);
  }

  const unmatchedExamples = [...counts.values()]
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, 5);

  return {
    matched,
    matchedByMethod: methodCounts,
    cached,
    customAlias,
    static: Math.max(matched - cached - customAlias, 0),
    missing,
    unmatched: [...counts.values()].reduce((sum, item) => sum + item.count, 0),
    unmatchedExamples,
  };
}

export function buildImportQualityReport(allLeads, importedLeads, options = {}) {
  const building = collectUnmatchedBuildings(importedLeads, options);
  return {
    importedRows: importedLeads.length,
    duplicateRows: Math.max((allLeads?.length || 0) - importedLeads.length, 0),
    building,
    missing: {
      name: countMissing(importedLeads, "name"),
      phone: countMissing(importedLeads, "phone"),
      unit: countMissing(importedLeads, "unit"),
      building: building.missing,
    },
  };
}
