import { supabase } from "../supabase";
import { createLeadInsightServices } from "../../../shared/lead-insights";
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
