import {
  IconAlertTriangle,
  IconCheck,
  IconDeviceDesktop,
  IconLink,
  IconRobot,
  IconWorld,
} from "@tabler/icons-react";

const STATE_COPY = {
  critical: {
    label: "Critical volume",
    description: "Daily outbound volume has reached 80 messages.",
    icon: IconAlertTriangle,
  },
  high: {
    label: "High volume",
    description: "Daily outbound volume has reached 60 messages.",
    icon: IconAlertTriangle,
  },
  warning: {
    label: "Volume warning",
    description: "Daily outbound volume has reached 40 messages.",
    icon: IconAlertTriangle,
  },
  normal: {
    label: "Normal activity",
    description: "No unusual sending pattern has been detected.",
    icon: IconCheck,
  },
};

function ActivityStat({ label, value }) {
  return (
    <div className="send-activity-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function SendActivityPanel({ activity, loading }) {
  if (loading && !activity) {
    return <div className="send-activity-loading">Checking today&apos;s WhatsApp activity...</div>;
  }

  const state = activity?.state || "normal";
  const repeatDetected = activity?.alerts?.some((alert) => alert.alert_type === "rapid_repeat");
  const stateCopy = repeatDetected && (activity?.total || 0) < 60
    ? {
        label: "Repeat send detected",
        description: "The same recipient was contacted more than once within 60 seconds.",
        icon: IconAlertTriangle,
      }
    : STATE_COPY[state];
  const StateIcon = stateCopy.icon;
  const origins = activity?.origins || {};

  return (
    <div className="send-activity-panel">
      <div className={`send-activity-status is-${state}`}>
        <span className="send-activity-status-icon">
          <StateIcon size={18} stroke={2} aria-hidden="true" />
        </span>
        <div>
          <strong>{stateCopy.label}</strong>
          <span>{stateCopy.description}</span>
        </div>
      </div>

      <div className="send-activity-stats">
        <ActivityStat label="Total today" value={activity?.total || 0} />
        <ActivityStat label="Automatic" value={activity?.sources?.auto || 0} />
        <ActivityStat label="Individual / API" value={activity?.sources?.manual || 0} />
        <ActivityStat
          label="Bulk / MCP"
          value={(activity?.sources?.bulk || 0) + (activity?.sources?.mcp || 0)}
        />
      </div>

      <div className="send-activity-origin-list">
        <div>
          <IconWorld size={17} stroke={1.9} aria-hidden="true" />
          <span>Web</span>
          <strong>{origins.web || 0}</strong>
        </div>
        <div>
          <IconDeviceDesktop size={17} stroke={1.9} aria-hidden="true" />
          <span>Desktop</span>
          <strong>{origins.desktop || 0}</strong>
        </div>
        <div>
          <IconRobot size={17} stroke={1.9} aria-hidden="true" />
          <span>Automation</span>
          <strong>{origins.automation || activity?.sources?.auto || 0}</strong>
        </div>
        <div>
          <IconLink size={17} stroke={1.9} aria-hidden="true" />
          <span>API / legacy</span>
          <strong>{(origins.api || 0) + (origins.mcp || 0) + (origins.unknown || 0)}</strong>
        </div>
      </div>

      <p className="send-activity-note">
        New sends record their exact route. Identical sends to the same recipient within 60 seconds are blocked automatically.
      </p>
    </div>
  );
}
