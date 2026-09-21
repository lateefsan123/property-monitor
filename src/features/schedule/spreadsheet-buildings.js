import { scheduleBuildingKey } from "../../../supabase/functions/_shared/building-schedule.js";

export function spreadsheetBuildingNames(leads, sourceId) {
  const names = new Map();
  for (const lead of leads || []) {
    if (!sourceId || lead.sourceId !== sourceId || !lead.building?.trim()) continue;
    names.set(scheduleBuildingKey(lead.building), lead.building.trim());
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}
