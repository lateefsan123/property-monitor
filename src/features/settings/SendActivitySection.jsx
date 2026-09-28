import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconBolt,
  IconCalendar,
  IconChevronDown,
  IconDots,
  IconExternalLink,
  IconLink,
  IconMessage,
  IconRefresh,
  IconUsers,
} from "@tabler/icons-react";
import { fetchWhatsAppSendActivity } from "../seller-signal/services";
import { activityRange, activityRangeLabel, dubaiDateKey, validateActivityRange } from "../../../shared/send-activity-dates";
import { DAILY_SEND_WARNING } from "../seller-signal/send-volume-guard";

// Web port of mobile's Send activity (activity-date-filter.js and
// send-activity-summary.js): a date filter, two headline numbers, then
// counts by message type and by where they were sent from.
const PRESETS = [["today", "Today"], ["yesterday", "Yesterday"], ["week", "Last 7 days"], ["month", "Last 30 days"], ["custom", "Custom dates"]];
const SOURCES = { auto: ["Automated", IconBolt], bulk: ["Bulk messages", IconUsers], manual: ["Manual", IconMessage], mcp: ["Integrations", IconLink], other: ["Other", IconDots] };
const titleCase = (value) => String(value).replace(/[_-]/g, " ").replace(/^./, (char) => char.toUpperCase());
const formatDay = (key) => new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

// The send detector (seller_signal_send_alerts) records daily volume at 40,
// 60 and 80 messages and rapid repeats to one recipient. Show one plain
// warning per day and kind, using the highest volume level reached.
function describeAlerts(alerts, showDay) {
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
        : `Automated messages stop at ${DAILY_SEND_WARNING} a day. More manual sends raise the chance WhatsApp restricts your number.` };
  });
}

function DateFilter({ value, onApply }) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState(value.preset);
  const [range, setRange] = useState(value.range);
  const [error, setError] = useState("");
  const wrap = useRef(null);
  const today = dubaiDateKey();
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (!wrap.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function apply() {
    try {
      const next = preset === "custom" ? range : activityRange(preset);
      validateActivityRange(next);
      onApply({ preset, range: next });
      setOpen(false);
    } catch (failure) { setError(failure.message); }
  }

  return (
    <div className="st-date" ref={wrap}>
      <button type="button" className="st-date-btn" aria-haspopup="dialog" aria-expanded={open}
        onClick={() => { setPreset(value.preset); setRange(value.range); setError(""); setOpen((current) => !current); }}>
        <IconCalendar size={17} stroke={1.8} aria-hidden="true" />
        <span>{activityRangeLabel(value.range)}</span>
        <IconChevronDown size={15} stroke={1.8} aria-hidden="true" />
      </button>
      {open ? (
        <div className="st-date-menu" role="dialog" aria-label="Date range">
          {PRESETS.map(([key, label]) => (
            <label key={key} className="st-date-option">
              <input type="radio" name="st-date" checked={preset === key} onChange={() => { setPreset(key); setError(""); }} />
              <span>
                {label}
                {key !== "custom" && preset === key ? <small>{activityRangeLabel(activityRange(key))}</small> : null}
              </span>
            </label>
          ))}
          {preset === "custom" ? (
            <div className="st-date-custom">
              <label><span>From</span><input type="date" max={today} value={range.startDate} onChange={(event) => { setError(""); setRange({ ...range, startDate: event.target.value }); }} /></label>
              <label><span>To</span><input type="date" max={today} value={range.endDate} onChange={(event) => { setError(""); setRange({ ...range, endDate: event.target.value }); }} /></label>
            </div>
          ) : null}
          <p className="st-note">All dates use Dubai time.</p>
          {error ? <p className="st-error" role="alert">{error}</p> : null}
          <button type="button" className="st-primary" onClick={apply}>Apply dates</button>
        </div>
      ) : null}
    </div>
  );
}

function CountGroup({ title, rows }) {
  return (
    <section className="st-group">
      <h3 className="st-group-title">{title}</h3>
      <div className="st-group-card">
        {rows.map((row) => (
          <div key={row.key} className="st-count-row">
            <span className="st-count-icon"><row.Icon size={17} stroke={1.7} aria-hidden="true" /></span>
            <span className="st-count-label">{row.label}</span>
            <strong>{row.count}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function SendActivitySection({ userId }) {
  const [selection, setSelection] = useState({ preset: "today", range: activityRange("today") });
  const range = selection.preset === "custom" ? selection.range : activityRange(selection.preset);
  const query = useQuery({
    queryKey: ["seller-signal", "send-activity", userId, range.startDate, range.endDate],
    queryFn: () => fetchWhatsAppSendActivity(userId, range),
    enabled: Boolean(userId),
    refetchInterval: 60_000,
  });
  const data = query.data;
  const isToday = data && (!data.startDate || (data.startDate === dubaiDateKey() && data.endDate === data.startDate));
  const sources = data ? Object.entries(data.sources || {}).filter(([, count]) => count > 0) : [];
  const origins = data ? Object.entries(data.origins || {}).filter(([, count]) => count > 0) : [];
  const warnings = describeAlerts(data?.alerts || [], !isToday);

  return (
    <div className="st-stack">
      <div className="st-activity-bar">
        <DateFilter value={{ ...selection, range }} onApply={setSelection} />
        <button type="button" className="st-round-btn" onClick={() => query.refetch()} disabled={query.isFetching} aria-label="Refresh activity">
          <IconRefresh className={query.isFetching ? "is-spinning" : ""} size={19} stroke={1.8} aria-hidden="true" />
        </button>
      </div>
      {query.isPending ? <p className="st-note" role="status">Loading activity…</p> : null}
      {query.error ? <p className="st-error" role="alert">{query.error.message} <button type="button" className="st-text-btn" onClick={() => query.refetch()}>Try again</button></p> : null}
      {data ? (
        <>
          <div className="st-activity-head"><strong>{data.startDate && !isToday ? "Overview" : "Today"}</strong><small>Dubai time</small></div>
          {warnings.map((warning) => (
            <div key={warning.key} className={`st-warning is-${warning.tone}`} role="status">
              <IconAlertTriangle size={20} stroke={1.8} aria-hidden="true" />
              <div><strong>{warning.title}</strong><p>{warning.body}</p></div>
            </div>
          ))}
          <div className="st-stats-card">
            <div className="st-stats">
              {[[data.total, "Messages sent"], [data.distinctLeads, "Sellers contacted"]].map(([count, label]) => (
                <div key={label}><strong>{count ?? 0}</strong><small>{label}</small></div>
              ))}
            </div>
            {isToday ? (
              <div className="st-meter">
                <div className="st-meter-top"><span>Today’s sends</span><span><strong>{data.total}</strong> / {DAILY_SEND_WARNING}</span></div>
                <div className="st-meter-track" role="progressbar" aria-label="Messages sent today" aria-valuemin={0} aria-valuemax={DAILY_SEND_WARNING} aria-valuenow={Math.min(data.total, DAILY_SEND_WARNING)}>
                  <span className={data.total >= DAILY_SEND_WARNING ? "is-over" : data.total >= DAILY_SEND_WARNING * 0.75 ? "is-near" : ""} style={{ width: `${Math.min(100, (data.total / DAILY_SEND_WARNING) * 100)}%` }} />
                </div>
                <small>Automated messages stop at {DAILY_SEND_WARNING} a day. Past that you’ll be asked before each manual send.</small>
              </div>
            ) : null}
          </div>
          {data.total === 0 ? (
            <div className="st-empty">
              <IconMessage size={30} stroke={1.5} aria-hidden="true" />
              <strong>{isToday ? "No messages sent today" : "No messages in this period"}</strong>
              <small>Your sending activity will appear here.</small>
            </div>
          ) : (
            <>
              <CountGroup title="Message activity" rows={sources.map(([key, count]) => ({ key, count, label: SOURCES[key]?.[0] || titleCase(key), Icon: SOURCES[key]?.[1] || IconMessage }))} />
              {origins.length ? <CountGroup title="Sent from" rows={origins.map(([key, count]) => ({ key, count, label: titleCase(key), Icon: IconExternalLink }))} /> : null}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
