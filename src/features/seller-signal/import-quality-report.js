import { getKnownBuildingMatch } from "./building-utils";

function countMissing(leads, field) {
  return (leads || []).filter((lead) => !String(lead?.[field] || "").trim()).length;
}

function collectUnmatchedBuildings(leads) {
  const counts = new Map();
  let missing = 0;
  let matched = 0;

  for (const lead of leads || []) {
    const match = getKnownBuildingMatch(lead.building);
    if (match.status === "matched") {
      matched += 1;
      continue;
    }
    if (match.status === "missing") {
      missing += 1;
      continue;
    }
    const name = match.inputName || lead.building || "Unknown";
    counts.set(name, (counts.get(name) || 0) + 1);
  }

  const unmatchedExamples = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, 5);

  return {
    matched,
    missing,
    unmatched: [...counts.values()].reduce((sum, count) => sum + count, 0),
    unmatchedExamples,
  };
}

export function buildImportQualityReport(allLeads, importedLeads) {
  const building = collectUnmatchedBuildings(importedLeads);
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
