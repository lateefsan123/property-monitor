// Account statuses for automated sends (seller_signal_statuses). A custom status
// matches the seller's status by exact name, before the built-in keyword
// checks, so a name like "Opportunity" is never read as Not Interested ("ni").
// follow_up_days 0 means "don't follow up": never message that seller.

function token(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Map of user id to Map(status token, follow-up days) for custom statuses.
export async function loadCustomStatusDays(client, userIds) {
  const result = new Map();
  const ids = [...new Set((userIds || []).map(String).filter(Boolean))];
  if (!ids.length) return result;
  const { data, error } = await client
    .from("seller_signal_statuses")
    .select("user_id, label, follow_up_days")
    .in("user_id", ids)
    .is("builtin_key", null);
  if (error) {
    // The table isn't in this database yet: no custom statuses.
    if (["42P01", "PGRST205"].includes(error.code)) return result;
    throw new Error(`Could not load seller statuses: ${error.message}`);
  }
  for (const row of data || []) {
    const userId = String(row.user_id);
    if (!result.has(userId)) result.set(userId, new Map());
    result.get(userId).set(token(row.label), Number(row.follow_up_days));
  }
  return result;
}

// The follow-up days of the seller's custom status, or undefined when the
// status isn't one of the account's own.
export function customStatusDays(statusDays, userId, status) {
  const key = token(status);
  if (!key) return undefined;
  return statusDays.get(String(userId || ""))?.get(key);
}
