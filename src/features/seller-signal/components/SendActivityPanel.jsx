import { IconAlertTriangle } from "@tabler/icons-react";

const WARNINGS = {
  critical: ["Critical volume", "Daily outbound volume has reached 80 messages."],
  high: ["High volume", "Daily outbound volume has reached 60 messages."],
  warning: ["Volume warning", "Daily outbound volume has reached 40 messages."],
};

export default function SendActivityPanel({ activity, loading }) {
  if (loading && !activity) return <p role="status">Checking today's activity...</p>;
  if (!activity) return <p role="status">Activity is unavailable right now.</p>;
  const total = activity.total || 0;
  const repeated = activity.alerts?.some((alert) => alert.alert_type === "rapid_repeat");
  const warning = repeated && total < 60
    ? ["Repeat send detected", "The same recipient was contacted more than once within 60 seconds."]
    : WARNINGS[activity.state];
  return (
    <div className="settings-send-activity">
      <div className="settings-today"><span>Today</span><span>{total} message{total === 1 ? "" : "s"} sent</span></div>
      {warning && <div className="settings-send-warning" role="alert"><IconAlertTriangle size={18} aria-hidden="true" /><div><strong>{warning[0]}</strong><p>{warning[1]}</p></div></div>}
      {total === 0 && <p className="settings-activity-empty">No messages sent today.</p>}
    </div>
  );
}
