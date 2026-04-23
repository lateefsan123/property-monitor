import { supabase } from "../../supabase";

export async function fetchLeadSources(userId) {
  const { data, error } = await supabase
    .from("lead_sources")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createDefaultLeadSources(userId, count = 10, startSortOrder = 0) {
  const defaults = Array.from({ length: count }, (_, index) => ({
    user_id: userId,
    label: "",
    type: "building",
    building_name: "",
    sheet_url: null,
    sort_order: startSortOrder + index,
  }));

  if (!defaults.length) return;

  const { error } = await supabase.from("lead_sources").insert(defaults);
  if (error) throw new Error(error.message);
}

export async function createLeadSource(userId, fields = {}) {
  const payload = {
    user_id: userId,
    label: fields.label || "",
    type: "building",
    building_name: fields.building_name || null,
    sheet_url: fields.sheet_url || null,
    sort_order: fields.sort_order ?? 0,
  };

  const { data, error } = await supabase
    .from("lead_sources")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function upsertLeadSource(source) {
  const payload = {
    id: source.id,
    user_id: source.user_id,
    label: source.label,
    type: source.type,
    building_name: source.building_name || null,
    sheet_url: source.sheet_url || null,
    sort_order: source.sort_order ?? 0,
  };

  const { error } = await supabase
    .from("lead_sources")
    .upsert(payload, { onConflict: "id" });

  if (error) throw new Error(error.message);
}

export async function clearLeadsForSource(userId, sourceId) {
  if (!sourceId) return;

  const { error: leadDeleteError } = await supabase
    .from("leads")
    .delete()
    .eq("user_id", userId)
    .eq("source_id", sourceId);
  if (leadDeleteError) throw new Error(leadDeleteError.message);
}

export async function deleteLeadSource(userId, sourceId) {
  if (!sourceId) return;

  const { error } = await supabase
    .from("lead_sources")
    .delete()
    .eq("user_id", userId)
    .eq("id", sourceId);

  if (error) throw new Error(error.message);
}
