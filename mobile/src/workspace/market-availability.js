import { fetchAvailableMarketBuildingKeys } from "./lead-insights";
import { getBuildingKeyVariants } from "../../../src/features/seller-signal/building-utils";

export async function fetchMarketAvailability(leads) {
  const keys = [
    ...new Set(
      leads.flatMap((lead) =>
        getBuildingKeyVariants(lead.resolvedBuilding || lead.building),
      ),
    ),
  ];
  if (!keys.length) return {};
  const available = new Set(await fetchAvailableMarketBuildingKeys(keys));
  return Object.fromEntries(
    leads.map((lead) => [
      lead.id,
      {
        status: getBuildingKeyVariants(
          lead.resolvedBuilding || lead.building,
        ).some((key) => available.has(key))
          ? "ready"
          : "error",
      },
    ]),
  );
}
