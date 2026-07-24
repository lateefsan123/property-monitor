import { supabase } from "../../supabase";

export async function fetchMessageTemplates(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("seller_signal_message_templates")
    .select("id, user_id, name, content, is_default, created_at, updated_at")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }

  return data || [];
}

export async function saveMessageTemplate({ content, id, isDefault, name, userId }) {
  if (!userId) throw new Error("Sign in to save a message template.");

  const cleanName = String(name || "").trim();
  const cleanContent = String(content || "").trim();
  if (!cleanName) throw new Error("Give this template a name.");
  if (!cleanContent.includes("{{transactions}}")) {
    throw new Error("Keep {{transactions}} in the template so every message includes the sale details.");
  }

  if (isDefault) {
    let clearQuery = supabase
      .from("seller_signal_message_templates")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("is_default", true);
    if (id) clearQuery = clearQuery.neq("id", id);
    const { error: clearError } = await clearQuery;
    if (clearError && clearError.code !== "42P01") throw new Error(clearError.message);
  }

  const record = {
    user_id: userId,
    name: cleanName,
    content: cleanContent,
    is_default: Boolean(isDefault),
  };
  const query = id
    ? supabase.from("seller_signal_message_templates").update(record).eq("id", id).eq("user_id", userId)
    : supabase.from("seller_signal_message_templates").insert(record);
  const { data, error } = await query
    .select("id, user_id, name, content, is_default, created_at, updated_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function setDefaultMessageTemplate({ id, userId }) {
  const { error: clearError } = await supabase
    .from("seller_signal_message_templates")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);
  if (clearError) throw new Error(clearError.message);

  const { data, error } = await supabase
    .from("seller_signal_message_templates")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, user_id, name, content, is_default, created_at, updated_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteMessageTemplate({ id, userId }) {
  const { data, error } = await supabase
    .from("seller_signal_message_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, is_default")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
