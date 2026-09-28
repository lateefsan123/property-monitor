import { useEffect, useRef, useState } from "react";

// Web port of mobile/src/workspace/home-activity.js: same total, 7D/14D
// switch and bar chart (today solid, earlier days at half opacity).
const HEIGHT = 180;

export default function HomeActivity({ series, days, onDaysChange, ready, loading }) {
  const wrap = useRef(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const element = wrap.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(1, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const visible = series.slice(-days);
  const total = visible.reduce((sum, point) => sum + point.count, 0);
  const max = Math.max(4, Math.ceil(Math.max(0, ...visible.map((point) => point.count)) / 4) * 4);
  const plot = Math.max(1, width - 28);
  const step = plot / Math.max(1, visible.length);
  const labels = [0, Math.floor((visible.length - 1) / 2), visible.length - 1];
  return (
    <div className="home-activity" ref={wrap}>
      <div className="home-activity-head">
        <div className="home-activity-total">
          <span className="home-muted">Messages sent</span>
          <strong>{ready ? total.toLocaleString() : "—"}</strong>
          <span className="home-muted home-small">Last {days} days</span>
        </div>
        <div className="home-segment" role="tablist" aria-label="Period">
          {[7, 14].map((value) => (
            <button key={value} type="button" role="tab" aria-selected={days === value} aria-label={`Last ${value} days`}
              className={days === value ? "is-active" : ""} onClick={() => onDaysChange(value)}>{value}D</button>
          ))}
        </div>
      </div>
      {loading ? <p className="home-muted" role="status">Loading message activity…</p> : ready ? (
        <>
          <svg className="home-activity-chart" width="100%" height={HEIGHT + 26} viewBox={`0 0 ${width} ${HEIGHT + 26}`} role="img" aria-label={`${total} messages sent in the last ${days} days`}>
            {[0, 0.5, 1].map((ratio) => (
              <g key={ratio}>
                <line x1={0} x2={plot} y1={8 + ratio * (HEIGHT - 20)} y2={8 + ratio * (HEIGHT - 20)} stroke="var(--border)" strokeDasharray={ratio === 1 ? undefined : "3 5"} />
                <text x={width} y={12 + ratio * (HEIGHT - 20)} fontSize={10} fill="var(--text-muted)" textAnchor="end">{max * (1 - ratio)}</text>
              </g>
            ))}
            {visible.map((point, index) => {
              const barHeight = (point.count / max) * (HEIGHT - 20);
              return (
                <rect key={point.key} x={index * step + step * 0.18} y={HEIGHT - 12 - barHeight} width={Math.max(0, step * 0.64)} height={Math.max(0, barHeight)} rx={3}
                  fill="var(--stat-value)" opacity={index === visible.length - 1 ? 1 : 0.5}>
                  <title>{`${point.count} message${point.count === 1 ? "" : "s"} · ${point.fullLabel || point.label}`}</title>
                </rect>
              );
            })}
            {labels.map((index) => (
              <text key={index} x={index === 0 ? 0 : index === visible.length - 1 ? plot : index * step + step / 2} y={HEIGHT + 14} fontSize={11} fill="var(--text-muted)"
                textAnchor={index === 0 ? "start" : index === visible.length - 1 ? "end" : "middle"}>{visible[index]?.label}</text>
            ))}
          </svg>
          {total === 0 && <p className="home-muted">No messages sent in this period.</p>}
        </>
      ) : <p className="home-muted">Message activity unavailable.</p>}
    </div>
  );
}
