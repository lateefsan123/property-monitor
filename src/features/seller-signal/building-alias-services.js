import { supabase } from "../../supabase";
import { normalizeBuildingAliasKey } from "./building-utils";
import { fetchAutomaticBuildingAliases } from "../../../shared/automatic-building-aliases";

function mapBuildingAliasRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    aliasName: row.alias_name || "",
    aliasKey: row.alias_key || "",
    canonicalName: row.canonical_name || "",
    isGlobal: Boolean(row.is_global),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isMissingAliasTableError(error) {
  return error?.code === "42P01" || String(error?.message || "").includes("building_aliases");
}

export async function fetchBuildingAliases(userId) {
  if (!userId) return [];

  const [{ data, error }, automatic] = await Promise.all([supabase
    .from("building_aliases")
    .select("*")
    .or(`is_global.eq.true,user_id.eq.${userId}`)
    .order("alias_name"), fetchAutomaticBuildingAliases(supabase, userId)]);

  if (isMissingAliasTableError(error)) return [];
  if (error) throw new Error(error.message);

  return [...(data || []).map(mapBuildingAliasRow), ...automatic];
}

export async function upsertBuildingAlias({ userId, aliasName, canonicalName }) {
  const cleanedAlias = String(aliasName || "").trim();
  const cleanedCanonical = String(canonicalName || "").trim();
  const aliasKey = normalizeBuildingAliasKey(cleanedAlias);

  if (!userId) throw new Error("Sign in required.");
  if (!cleanedAlias) throw new Error("Building alias is missing.");
  if (!cleanedCanonical) throw new Error("Pick a building match first.");
  if (!aliasKey) throw new Error("Building alias is not valid.");

  const payload = {
    user_id: userId,
    alias_name: cleanedAlias,
    alias_key: aliasKey,
    canonical_name: cleanedCanonical,
    is_global: false,
  };

  const { data, error } = await supabase
    .from("building_aliases")
    .upsert(payload, { onConflict: "user_id,alias_key" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapBuildingAliasRow(data);
}

// Building names the matcher couldn't settle on its own but has options for
// ("Arabian Ranches" -> Arabian Ranches 1, 2 or 3). The broker picks one.
export async function fetchBuildingChoices(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("building_resolutions")
    .select("raw_name, candidates")
    .eq("user_id", userId)
    .eq("status", "review")
    .order("raw_name")
    .limit(500);
  if (error) throw new Error(error.message);
  return (data || []).map((row) => {
    const seen = new Set();
    const options = (Array.isArray(row.candidates) ? row.candidates : [])
      .map((candidate) => ({ name: String(candidate?.name || "").trim(), label: String(candidate?.name || "").split(",")[0].trim() }))
      .filter((option) => option.name && !seen.has(option.label) && seen.add(option.label))
      .slice(0, 6);
    return { rawName: String(row.raw_name || "").trim(), options };
  }).filter((choice) => choice.rawName && choice.options.length >= 2);
}
