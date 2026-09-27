import { supabase } from "../../supabase";
import { selectCachedBuildings } from '../../../shared/cached-buildings.js';

function isMissingBuildingCacheError(error) {
  return error?.code === "42P01" || /relation .*buildings.* does not exist/i.test(String(error?.message || ""));
}

export async function fetchCachedBuildings() {
  try { return await selectCachedBuildings(supabase); }
  catch (error) {
    if (isMissingBuildingCacheError(error)) return [];
    throw error;
  }
}
