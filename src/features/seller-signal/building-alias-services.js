import { supabase } from "../../supabase";
import { normalizeBuildingAliasKey } from "./building-utils";

function mapBuildingAliasRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    aliasName: row.alias_name || "",
    aliasKey: row.alias_key || "",
    canonicalName: row.canonical_name || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isMissingAliasTableError(error) {
  return error?.code === "42P01" || String(error?.message || "").includes("building_aliases");
}

export async function fetchBuildingAliases(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("building_aliases")
    .select("*")
    .eq("user_id", userId)
    .order("alias_name");

  if (isMissingAliasTableError(error)) return [];
  if (error) throw new Error(error.message);

  return (data || []).map(mapBuildingAliasRow);
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
  };

  const { data, error } = await supabase
    .from("building_aliases")
    .upsert(payload, { onConflict: "user_id,alias_key" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapBuildingAliasRow(data);
}
