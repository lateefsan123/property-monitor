import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconChevronRight } from "@tabler/icons-react";
import { calendarDay, calendarTime } from "../../../shared/calendar-day";
import { beginIntegrationConnect, integrationRequest } from "../../integration-client";

// Web ports of mobile's Home email and calendar tabs (email-summary-card.js,
// calendar-today.js, home-connection-prompt.js), using the same shared queries.
const HOME_PROVIDERS = {
  email: [
    { id: "google", name: "Gmail", icon: "https://www.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png" },
    { id: "microsoft", name: "Outlook", icon: "https://res.cdn.office.net/files/fabric-cdn-prod_20221201.001/assets/brand-icons/product/png/outlook_48x1.png" },
  ],
  calendar: [
    { id: "google", name: "Google Calendar", icon: "https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png" },
    { id: "microsoft", name: "Outlook Calendar", icon: "https://res.cdn.office.net/files/fabric-cdn-prod_20221201.001/assets/brand-icons/product/png/outlook_48x1.png" },
  ],
};

function ProviderIcons({ feature, only }) {
  return HOME_PROVIDERS[feature].filter((provider) => !only || only.includes(provider.id)).map((provider) => (
    <img key={provider.id} className="home-provider-icon" src={provider.icon} alt={provider.name} width={24} height={24} />
  ));
}

export function HomeConnectionPrompt({ feature, connections = [] }) {
  const email = feature === "email";
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function connect(provider) {
    setBusy(provider); setError("");
    try { await beginIntegrationConnect(integrationRequest, provider, feature, feature === "calendar" ? "events" : undefined); }
    catch (failure) { setError(failure.message || "Could not connect. Please try again."); setBusy(""); }
  }
  return (
    <div className="home-connect">
      <div className="home-connect-icons"><ProviderIcons feature={feature} /></div>
      <h3>{email ? "Your inbox, in a few lines" : "Your day, all here"}</h3>
      <p className="home-muted">{email ? "Connect Gmail or Outlook for a daily email briefing." : "Connect Google Calendar or Outlook to bring your appointments into Repeat AI."}</p>
      <button type="button" className="home-connect-button" aria-expanded={open} onClick={() => { setError(""); setOpen((value) => !value); }}>
        {email ? "Connect email" : "Connect calendar"}<IconChevronRight size={16} stroke={2} aria-hidden="true" />
      </button>
      {open && (
        <div className="home-connect-options">
          {HOME_PROVIDERS[feature].map((provider) => {
            const configured = connections.some((item) => item.provider === provider.id && item.feature === feature && item.configured);
            return (
              <button key={provider.id} type="button" className="home-connect-option" disabled={!configured || Boolean(busy)} onClick={() => connect(provider.id)} aria-label={`Connect ${provider.name}`}>
                <img src={provider.icon} alt="" width={28} height={28} />
                <span>{provider.name}</span>
                <span className="home-muted home-small">{!configured ? "Unavailable" : busy === provider.id ? "Connecting…" : ""}</span>
                {configured && busy !== provider.id && <IconChevronRight size={18} stroke={2} aria-hidden="true" />}
              </button>
            );
          })}
          {error && <p className="home-error" role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}

export function EmailBrief({ query, connectedProviders = [] }) {
  const data = query.data;
  const summary = data?.summary;
  const working = query.generate.isPending || data?.status === "processing";
  const error = query.error || query.configure.error || query.generate.error;
  function setEnabled(enabled) {
    if (enabled && !window.confirm("Enable daily summaries?\n\nText from up to 10 recent emails is sent to OpenAI for your daily briefing. Attachments are excluded.")) return;
    query.configure.mutate(enabled);
  }
  return (
    <div className="home-panel">
      <div className="home-panel-head">
        <ProviderIcons feature="email" only={connectedProviders} />
        <h3>Your daily brief</h3>
        {data && (
          <label className="home-switch">
            <input type="checkbox" role="switch" aria-label="Daily email summaries" checked={Boolean(data.enabled)}
              disabled={query.configure.isPending || (!data.available && !data.enabled)} onChange={(event) => setEnabled(event.target.checked)} />
            <span aria-hidden="true" />
          </label>
        )}
      </div>
      {query.isPending && <p className="home-muted" role="status">Loading your briefing…</p>}
      {error && <p className="home-error" role="alert">{error.message || String(error)} <button type="button" className="home-text-button" onClick={query.retry}>Try again</button></p>}
      {data && !data.available && <p className="home-muted">Email summaries are not available yet. Please try again later.</p>}
      {working && <p className="home-muted" aria-live="polite">Preparing your briefing…</p>}
      {data?.error && <p className="home-muted" role="alert">{data.error}</p>}
      {summary ? <p className="home-brief">{summary.overview}</p>
        : data?.available && !working && !error && !data.error ? <p className="home-muted">{data.enabled ? "Your briefing will appear here when it’s ready." : "Turn on your daily email briefing."}</p> : null}
    </div>
  );
}

export function CalendarToday({ userId, connections, connectionError, retryConnections }) {
  const [clock, setClock] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const day = calendarDay(clock);
  const connected = (connections || []).filter((item) => item.feature === "calendar" && item.connected);
  const providerKey = connected.map((item) => item.provider).sort().join(",");
  const query = useQuery({
    queryKey: ["calendar-today", userId, providerKey, day.day],
    enabled: Boolean(userId && providerKey), staleTime: 30000, refetchInterval: providerKey ? 60000 : false,
    queryFn: async ({ signal }) => Promise.all(providerKey.split(",").map(async (provider) => {
      try { return { provider, ...await integrationRequest({ action: "read", provider, feature: "calendar", input: { start: day.start, end: day.end } }, signal, userId) }; }
      catch (failure) { if (signal.aborted) throw failure; return { provider, error: failure.message }; }
    })),
  });
  if (!connections) return connectionError
    ? <p className="home-error" role="alert">{connectionError.message} <button type="button" className="home-text-button" onClick={retryConnections}>Try again</button></p>
    : <p className="home-muted" role="status">Loading your calendar…</p>;
  if (!connected.length) return <HomeConnectionPrompt feature="calendar" connections={connections} />;
  const results = query.data || [];
  const events = results.flatMap((result) => (result.items || []).map((event) => ({ ...event, provider: result.provider })))
    .sort((a, b) => Number(Boolean(b.allDay)) - Number(Boolean(a.allDay)) || calendarTime(a).localeCompare(calendarTime(b)));
  const failure = results.find((result) => result.error)?.error || query.error?.message;
  return (
    <div className="home-panel">
      <div className="home-panel-head"><ProviderIcons feature="calendar" only={connected.map((item) => item.provider)} /><h3>Today</h3></div>
      {query.isPending && <p className="home-muted" role="status">Loading today’s events…</p>}
      {failure && <p className="home-error" role="alert">{failure} <button type="button" className="home-text-button" onClick={() => query.refetch()}>Try again</button></p>}
      {events.map((event) => (
        <div key={`${event.provider}:${event.id}`} className="home-event">
          <span className="home-event-time">{calendarTime(event)}</span>
          <span className="home-event-body"><strong>{event.title || "Untitled event"}</strong>{event.location && <span className="home-muted">{event.location}</span>}</span>
        </div>
      ))}
      {!query.isPending && !failure && !events.length && <p className="home-muted">No appointments today.</p>}
      {results.some((result) => result.hasMore) && <p className="home-muted">More events are available in your calendar app.</p>}
    </div>
  );
}
