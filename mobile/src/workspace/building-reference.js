import { supabase } from "../supabase";
import { createBuildingReferenceServices } from "../../../shared/building-reference";
export const {
  fetchBuildingAliases,
  upsertBuildingAlias,
  fetchCachedBuildings,
} = createBuildingReferenceServices(supabase);
