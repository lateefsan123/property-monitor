import { supabase } from "../supabase";
import { buildInsightMessage, createLeadInsightServices } from "../../../shared/lead-insights";
import { getBuildingKeyVariants } from "../../../src/features/seller-signal/building-utils";
export const {
  fetchAvailableMarketBuildingKeys,
  fetchBuildingKeysWithTransactionsOn,
  fetchBuildingMarketData,
  getMissingFallbackBuildingNames,
  computeLeadInsights,
} = createLeadInsightServices(supabase);
export async function fetchLeadInsights(leads, template) {
  const targets = leads
    .filter((lead) => lead.building)
    .map((lead) => ({
      ...lead,
      building: lead.resolvedBuilding || lead.building,
    }));
  const data = await fetchBuildingMarketData(
    targets.flatMap((lead) => getBuildingKeyVariants(lead.building)),
  );
  return computeLeadInsights(targets, data, {}, template);
}

// The same message as fetchLeadInsights, rebuilt with the current templates:
// an insight's stored message can predate the templates loading or changing.
export function leadInsightMessage(lead, insight, template) {
  return buildInsightMessage({ ...lead, building: lead.resolvedBuilding || lead.building }, insight, template);
}
