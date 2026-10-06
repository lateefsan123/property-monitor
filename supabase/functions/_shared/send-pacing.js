// Per-account pacing for automated WhatsApp sends: each account chooses the
// Dubai hours messages go out in and the gap between them
// (seller_signal_automation_settings.send_window_start_hour / _end_hour /
// send_interval_minutes). The dispatcher runs every 5 minutes, so a gap
// counts as passed up to 90 seconds early to absorb scheduler drift.
export const SEND_INTERVAL_OPTIONS = [5, 10, 15, 30, 60];
export const DEFAULT_SEND_WINDOW = { start: 9, end: 21 };
export const DEFAULT_SEND_INTERVAL_MINUTES = 5;
const DRIFT_MS = 90 * 1000;

function hour(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 24 ? number : fallback;
}

export function normalizePacing(row, defaults = DEFAULT_SEND_WINDOW) {
  let start = hour(row?.send_window_start_hour, defaults.start);
  let end = hour(row?.send_window_end_hour, defaults.end);
  if (end <= start) ({ start, end } = defaults);
  const interval = SEND_INTERVAL_OPTIONS.includes(Number(row?.send_interval_minutes))
    ? Number(row.send_interval_minutes)
    : DEFAULT_SEND_INTERVAL_MINUTES;
  return { start, end, interval };
}

// How many messages fit in a window at a given gap, capped at the daily limit.
export function messagesThatFit({ start, end, interval }, dailyCap = 40) {
  const minutes = Math.max(0, (end - start) * 60);
  return Math.min(dailyCap, Math.floor(minutes / interval));
}

export async function loadSendPacing(client, userIds, defaults = DEFAULT_SEND_WINDOW) {
  const result = new Map();
  const ids = [...new Set((userIds || []).map(String).filter(Boolean))];
  for (const id of ids) result.set(id, normalizePacing(null, defaults));
  if (!ids.length) return result;
  const { data, error } = await client
    .from("seller_signal_automation_settings")
    .select("user_id, send_window_start_hour, send_window_end_hour, send_interval_minutes")
    .in("user_id", ids);
  if (error) {
    // 42703: the pacing columns aren't in this database yet; use the defaults.
    if (error.code === "42703") return result;
    throw new Error(`Could not load send pacing: ${error.message}`);
  }
  for (const row of data || []) result.set(String(row.user_id), normalizePacing(row, defaults));
  return result;
}

// Latest automated message per account in the last two hours.
export async function loadLastAutoSends(client, userIds, now = new Date()) {
  const result = new Map();
  const ids = [...new Set((userIds || []).map(String).filter(Boolean))];
  if (!ids.length) return result;
  const since = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from("whatsapp_messages")
    .select("user_id, created_at")
    .in("user_id", ids)
    .eq("direction", "outbound")
    .eq("send_source", "auto")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(ids.length * 30);
  if (error) throw new Error(`Could not load recent sends: ${error.message}`);
  for (const row of data || []) {
    const userId = String(row.user_id);
    if (!result.has(userId)) result.set(userId, new Date(row.created_at).getTime());
  }
  return result;
}

// Accounts that must wait this run, with the reason: outside their hours, or
// their gap since the last automated message hasn't passed.
export function accountsNotDue({ pacing, lastSends, now = new Date(), dubaiHour, enforceWindow = true }) {
  const waiting = new Map();
  for (const [userId, { start, end, interval }] of pacing) {
    if (enforceWindow && (dubaiHour === null || dubaiHour < start || dubaiHour >= end)) {
      waiting.set(userId, "outsideSendWindow");
      continue;
    }
    const last = lastSends.get(userId);
    if (last && now.getTime() - last < interval * 60 * 1000 - DRIFT_MS) waiting.set(userId, "spacing");
  }
  return waiting;
}

// "9 am", "12 pm", "9 pm", "12 am" for a Dubai hour (0-24).
export function formatHour(value) {
  if (Number(value) === 24) return "midnight";
  const hourValue = Number(value) % 24;
  const suffix = hourValue < 12 ? "am" : "pm";
  const twelve = hourValue % 12 === 0 ? 12 : hourValue % 12;
  return `${twelve} ${suffix}`;
}

export function formatInterval(minutes) {
  return Number(minutes) === 60 ? "1 hour" : `${minutes} min`;
}
