import { IconHistory } from "@tabler/icons-react";

function formatConnectionEventTime(value) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getConnectionEventState(event) {
  if (event.recovered_at) return { label: "Recovered automatically", tone: "recovered" };
  if (["manual_disconnect", "session_reset"].includes(event.reason_code)) {
    return { label: "Expected disconnect", tone: "expected" };
  }
  if (event.recoverable) return { label: "Retrying automatically", tone: "retrying" };
  return { label: "Needs attention", tone: "attention" };
}

export default function WhatsAppConnectionHistory({ events = [], loading = false }) {
  return (
    <section className="whatsapp-connection-history" aria-label="WhatsApp connection history">
      <div className="whatsapp-connection-history-heading">
        <span>
          <IconHistory size={16} stroke={2} aria-hidden="true" />
          Connection history
        </span>
        {!loading && events.length > 0 && <small>Latest {events.length}</small>}
      </div>

      {loading ? (
        <div className="whatsapp-connection-history-empty">Loading connection history...</div>
      ) : events.length === 0 ? (
        <div className="whatsapp-connection-history-empty">No disconnects recorded yet.</div>
      ) : (
        <div className="whatsapp-connection-event-list">
          {events.map((event) => {
            const state = getConnectionEventState(event);
            return (
              <article className="whatsapp-connection-event" key={event.id} data-tone={state.tone}>
                <div className="whatsapp-connection-event-topline">
                  <strong>{event.reason_label}</strong>
                  <span>{state.label}</span>
                </div>
                <div className="whatsapp-connection-event-meta">
                  <span>{formatConnectionEventTime(event.occurred_at)}</span>
                  {event.status_code && <span>WhatsApp code {event.status_code}</span>}
                </div>
                <p>{event.recovery_action}</p>
                {event.message && event.message !== event.reason_label && (
                  <small className="whatsapp-connection-event-technical">
                    Technical detail: {event.message}
                  </small>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
