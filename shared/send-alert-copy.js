// Plain-language copy for the send detector's alerts (seller_signal_send_alerts:
// daily volume at 40/60/80 messages, and rapid repeats to one recipient).
// One warning per day and kind, using the highest volume level reached.
// Shared by web and mobile so both say the same thing.
export const DAILY_AUTOMATED_LIMIT = 40;

const formatDay = (key) => new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function describeSendAlerts(alerts = [], showDay = false) {
  const byKey = new Map();
  for (const alert of alerts) {
    const day = alert.dubai_date || String(alert.created_at || "").slice(0, 10);
    const key = `${alert.alert_type}:${day}`;
    const current = byKey.get(key);
    if (!current || (alert.threshold_count || 0) > (current.threshold_count || 0)) byKey.set(key, { ...alert, day });
  }
  return [...byKey.entries()].map(([key, alert]) => {
    const when = showDay && alert.day ? ` on ${formatDay(alert.day)}` : " today";
    if (alert.alert_type === "rapid_repeat") {
      return { key, tone: "amber", title: `Same seller messaged twice within a minute${when}`,
        body: "Repeated messages to one person look like spam to WhatsApp. Check for a double send before sending again." };
    }
    const level = alert.threshold_count || alert.observed_count;
    return { key, tone: level >= 60 ? "red" : "amber", title: `Over ${level} messages sent${when}`,
      body: level >= 60
        ? "This is a lot for one number. Slow down for the rest of the day to keep WhatsApp from limiting or banning it."
        : `Automated messages stop at ${DAILY_AUTOMATED_LIMIT} a day. More manual sends raise the chance WhatsApp restricts your number.` };
  });
}
