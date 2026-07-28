import { supabase } from "../../supabase";

const SUCCESS_STATUSES = ["sent", "delivered", "read"];

function getDubaiDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Dubai",
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getDubaiDayBounds(dateKey) {
  const start = new Date(`${dateKey}T00:00:00+04:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function createSourceCounts(messages) {
  const counts = { auto: 0, bulk: 0, manual: 0, mcp: 0, other: 0 };
  for (const message of messages) {
    const source = Object.prototype.hasOwnProperty.call(counts, message.send_source)
      ? message.send_source
      : "other";
    counts[source] += 1;
  }
  return counts;
}

function createOriginCounts(messages) {
  const counts = {};
  for (const message of messages) {
    const origin = message.initiated_via || "unknown";
    counts[origin] = (counts[origin] || 0) + 1;
  }
  return counts;
}

function getVolumeState(total, alerts) {
  if (total >= 80 || alerts.some((alert) => alert.severity === "critical")) return "critical";
  if (total >= 60 || alerts.some((alert) => alert.severity === "high")) return "high";
  if (total >= 40 || alerts.some((alert) => alert.severity === "warning")) return "warning";
  return "normal";
}

export async function fetchWhatsAppSendActivity(userId) {
  if (!userId) return null;

  const dateKey = getDubaiDateKey();
  const { start, end } = getDubaiDayBounds(dateKey);
  let { data: messages, error: messageError } = await supabase
    .from("whatsapp_messages")
    .select("id, lead_id, send_source, initiated_via, status, sent_at")
    .eq("user_id", userId)
    .eq("direction", "outbound")
    .in("status", SUCCESS_STATUSES)
    .gte("sent_at", start)
    .lt("sent_at", end)
    .order("sent_at", { ascending: false });

  if (messageError?.code === "42703") {
    const fallback = await supabase
      .from("whatsapp_messages")
      .select("id, lead_id, send_source, status, sent_at")
      .eq("user_id", userId)
      .eq("direction", "outbound")
      .in("status", SUCCESS_STATUSES)
      .gte("sent_at", start)
      .lt("sent_at", end)
      .order("sent_at", { ascending: false });
    messages = (fallback.data || []).map((message) => ({ ...message, initiated_via: "unknown" }));
    messageError = fallback.error;
  }

  if (messageError) throw new Error(messageError.message);

  const { data: alerts, error: alertsError } = await supabase
    .from("seller_signal_send_alerts")
    .select("id, alert_type, severity, threshold_count, observed_count, details, created_at")
    .eq("user_id", userId)
    .eq("dubai_date", dateKey)
    .order("created_at", { ascending: false });

  if (alertsError && alertsError.code !== "42P01") throw new Error(alertsError.message);

  const rows = messages || [];
  const alertRows = alerts || [];
  const sources = createSourceCounts(rows);

  return {
    alerts: alertRows,
    dateKey,
    distinctLeads: new Set(rows.map((message) => message.lead_id).filter(Boolean)).size,
    origins: createOriginCounts(rows),
    sources,
    state: getVolumeState(rows.length, alertRows),
    total: rows.length,
  };
}
