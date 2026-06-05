import { supabase } from "../../supabase";

function isMissingBuildingCacheError(error) {
  return error?.code === "42P01" || String(error?.message || "").includes("buildings");
}

export async function fetchCachedBuildings() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("buildings")
    .select("key, search_name, location_name, location_id")
    .order("search_name");

  if (isMissingBuildingCacheError(error)) return [];
  if (error) throw new Error(error.message);

  return data || [];
}
