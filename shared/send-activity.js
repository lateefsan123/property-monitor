import { activityRange, dubaiDateKey, validateActivityRange } from './send-activity-dates.js';

// Shared by desktop and native. The authenticated client is supplied by each app.
export function createSendActivityServices(supabase) {
  const SUCCESS_STATUSES = ["sent", "delivered", "read"];

  async function allRows(makeQuery) {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await makeQuery().range(offset, offset + 499);
      if (error) return { data: null, error };
      rows.push(...(data || []));
      if (!data || data.length < 500) return { data: rows, error: null };
    }
  }

  function createSourceCounts(messages) {
    const counts = { auto: 0, bulk: 0, manual: 0, mcp: 0, other: 0 };
    for (const message of messages) {
      const source = Object.prototype.hasOwnProperty.call(
        counts,
        message.send_source,
      )
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
    if (total >= 80 || alerts.some((alert) => alert.severity === "critical"))
      return "critical";
    if (total >= 60 || alerts.some((alert) => alert.severity === "high"))
      return "high";
    if (total >= 40 || alerts.some((alert) => alert.severity === "warning"))
      return "warning";
    return "normal";
  }

  async function fetchWhatsAppSendActivity(userId, range = activityRange()) {
    if (!userId) return null;

    const dateKey = range.startDate;
    const { start, end } = validateActivityRange(range);
    let { data: messages, error: messageError } = await allRows(() => supabase
      .from("whatsapp_messages")
      .select("id, lead_id, send_source, initiated_via, status, sent_at")
      .eq("user_id", userId)
      .eq("direction", "outbound")
      .in("status", SUCCESS_STATUSES)
      .gte("sent_at", start)
      .lt("sent_at", end)
      .order("sent_at", { ascending: false }).order("id"));

    if (messageError?.code === "42703") {
      const fallback = await allRows(() => supabase
        .from("whatsapp_messages")
        .select("id, lead_id, send_source, status, sent_at")
        .eq("user_id", userId)
        .eq("direction", "outbound")
        .in("status", SUCCESS_STATUSES)
        .gte("sent_at", start)
        .lt("sent_at", end)
        .order("sent_at", { ascending: false }).order("id"));
      messages = (fallback.data || []).map((message) => ({
        ...message,
        initiated_via: "unknown",
      }));
      messageError = fallback.error;
    }

    if (messageError) throw new Error(messageError.message);

    const { data: alerts, error: alertsError } = await allRows(() => supabase
      .from("seller_signal_send_alerts")
      .select(
        "id, alert_type, severity, threshold_count, observed_count, details, dubai_date, created_at",
      )
      .eq("user_id", userId)
      .gte("dubai_date", range.startDate)
      .lte("dubai_date", range.endDate)
      .order("created_at", { ascending: false }).order("id"));

    if (alertsError && alertsError.code !== "42P01")
      throw new Error(alertsError.message);

    const rows = messages || [];
    const alertRows = alerts || [];
    const sources = createSourceCounts(rows);
    const dailyCounts = {};
    for (const row of rows) {
      const day = dubaiDateKey(new Date(row.sent_at));
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    }

    return {
      alerts: alertRows,
      dateKey,
      startDate: range.startDate,
      endDate: range.endDate,
      distinctLeads: new Set(
        rows.map((message) => message.lead_id).filter(Boolean),
      ).size,
      origins: createOriginCounts(rows),
      sources,
      state: getVolumeState(Math.max(0, ...Object.values(dailyCounts)), alertRows),
      total: rows.length,
    };
  }

  return { fetchWhatsAppSendActivity };
}
