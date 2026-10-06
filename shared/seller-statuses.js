// Seller statuses: the four built-in ones plus each account's own. Rows live in
// seller_signal_statuses (one per custom status, or a builtin_key row that
// changes a built-in status's follow-up gap). Shared by web and mobile.
export const BUILT_IN_STATUS_KEYS = ["not_interested", "prospect", "market_appraisal", "for_sale_available"];
export const STATUS_COLOR_OPTIONS = ["#3b82f6", "#22a06b", "#e8733a", "#d6336c", "#8b5cf6", "#0ea5a4", "#c99400", "#6b7280"];
export const FOLLOW_UP_OPTIONS = [
  { days: 0, label: "Don't follow up" },
  { days: 3, label: "Every 3 days" },
  { days: 5, label: "Every 5 days" },
  { days: 7, label: "Every week" },
  { days: 14, label: "Every 2 weeks" },
  { days: 30, label: "Every month" },
  { days: 60, label: "Every 2 months" },
  { days: 90, label: "Every 3 months" },
];
export const MAX_STATUSES = 30;

export function statusesQueryKey(userId) {
  return ["seller-signal", "statuses", userId];
}

function token(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function customStatusId(row) {
  return `custom:${row.id}`;
}

// Merges an account's rows into the built-in rules: built-ins keep their
// keywords but take an overridden follow-up gap; custom statuses come first
// and match their exact name, so "Hot – available" never reads as For Sale.
export function mergeStatusRules(baseRules, rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const overrides = new Map(list.filter((row) => row.builtin_key).map((row) => [row.builtin_key, row]));
  const builtIns = baseRules
    .filter((rule) => !rule.custom)
    .map((rule) => {
      const override = overrides.get(rule.id);
      return override && rule.id !== "not_interested" ? { ...rule, days: Number(override.follow_up_days) } : rule;
    });
  const custom = list
    .filter((row) => !row.builtin_key && token(row.label))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.created_at || "").localeCompare(String(b.created_at || "")))
    .map((row) => ({
      id: customStatusId(row),
      rowId: row.id,
      label: String(row.label).trim(),
      days: Number(row.follow_up_days),
      color: row.color || null,
      keywords: [String(row.label).trim()],
      exact: true,
      custom: true,
    }));
  return [...custom, ...builtIns];
}

// The rule a raw status text belongs to: custom names exactly, then the
// built-in keywords as before.
export function matchStatusRule(rules, rawStatus) {
  const normalized = token(rawStatus);
  if (!normalized) return null;
  const exact = rules.find((rule) => rule.exact && token(rule.label) === normalized);
  if (exact) return exact;
  for (const rule of rules) {
    if (rule.exact) continue;
    if (rule.keywords.some((keyword) => normalized.includes(token(keyword)))) return rule;
  }
  return null;
}

// Status texts automations must never message: Not Interested plus any
// custom status set to "Don't follow up".
export function optedOutStatusTokens(rows = []) {
  return new Set((rows || []).filter((row) => !row.builtin_key && Number(row.follow_up_days) === 0).map((row) => token(row.label)));
}

export function createSellerStatusServices(supabase) {
  async function fetchStatuses(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from("seller_signal_statuses")
      .select("id, label, color, follow_up_days, builtin_key, position, created_at")
      .eq("user_id", userId)
      .order("position", { ascending: true });
    // 42P01/PGRST205: the table isn't in this database yet; built-ins only.
    if (error) {
      if (["42P01", "PGRST205"].includes(error.code)) return [];
      throw new Error(error.message);
    }
    return data || [];
  }

  async function saveStatus(userId, status) {
    if (!userId) throw new Error("Sign in to change statuses.");
    const label = String(status.label || "").trim();
    if (!status.builtin_key && !label) throw new Error("Give the status a name.");
    const row = {
      user_id: userId,
      label: label || status.builtin_key,
      color: status.color || null,
      follow_up_days: Math.max(0, Math.min(365, Number(status.follow_up_days) || 0)),
      builtin_key: status.builtin_key || null,
      position: Number.isInteger(status.position) ? status.position : 0,
      updated_at: new Date().toISOString(),
    };
    const query = status.id
      ? supabase.from("seller_signal_statuses").update(row).eq("id", status.id).eq("user_id", userId)
      : supabase.from("seller_signal_statuses").insert(row);
    const { data, error } = await query.select("id, label, color, follow_up_days, builtin_key, position, created_at").single();
    if (error) {
      if (error.code === "23505") throw new Error("You already have a status with that name.");
      throw new Error(error.message);
    }
    return data;
  }

  // Renaming moves the sellers that carried the old name onto the new one.
  async function renameSellers(userId, fromLabel, toLabel) {
    if (!userId || !fromLabel || !toLabel || fromLabel === toLabel) return;
    const { error } = await supabase.from("leads").update({ status: toLabel }).eq("user_id", userId).eq("status", fromLabel);
    if (error) throw new Error(error.message);
  }

  // Deleting a custom status clears it from the sellers that had it.
  async function deleteStatus(userId, row) {
    if (!userId || !row?.id) return;
    const { error } = await supabase.from("seller_signal_statuses").delete().eq("id", row.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    if (!row.builtin_key && row.label) {
      const { error: leadsError } = await supabase.from("leads").update({ status: null }).eq("user_id", userId).eq("status", row.label);
      if (leadsError) throw new Error(leadsError.message);
    }
  }

  return { fetchStatuses, saveStatus, renameSellers, deleteStatus };
}
