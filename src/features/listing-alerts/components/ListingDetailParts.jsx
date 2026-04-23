import { useMemo } from "react";
import { formatEventTimestamp, formatPrice } from "../formatters";

const CHART_HEIGHT = 220;
const CHART_PAD_LEFT = 16;
const CHART_PAD_RIGHT = 16;
const CHART_PAD_TOP = 24;
const CHART_PAD_BOTTOM = 32;
const CHART_WIDTH = 560;

export function ExternalLinkIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3h7v7" />
      <path d="M10 14L21 3" />
      <path d="M21 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    </svg>
  );
}

function ArrowIcon({ direction = "down", size = 14 }) {
  const d = direction === "down" ? "M12 5v14M5 12l7 7 7-7" : "M12 19V5M5 12l7-7 7 7";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function BackIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

export function Eyebrow({ children, className = "" }) {
  return <div className={`ld-eyebrow ${className}`}>{children}</div>;
}

export function PriceDeltaChip({ priceDelta }) {
  if (!Number.isFinite(priceDelta) || priceDelta === 0) return null;
  const isDrop = priceDelta < 0;
  return (
    <span className={`ld-delta-chip ${isDrop ? "ld-delta-drop" : "ld-delta-rise"}`}>
      <ArrowIcon direction={isDrop ? "down" : "up"} size={13} />
      {formatPrice(Math.abs(priceDelta))}
    </span>
  );
}

function StatCell({ label, value, accentClass }) {
  return (
    <div className="ld-stat-cell">
      <div className={`ld-stat-value ${accentClass || ""}`}>{value}</div>
      <Eyebrow className="ld-stat-eyebrow">{label}</Eyebrow>
    </div>
  );
}

export function StatStrip({ items }) {
  return (
    <div className="ld-stat-strip">
      {items.map((item, index) => (
        <div key={item.label} className={`ld-stat-strip-cell${index === 0 ? " first" : ""}`}>
          <StatCell label={item.label} value={item.value} accentClass={item.accentClass} />
        </div>
      ))}
    </div>
  );
}

function TimelineEvent({ event, isLast }) {
  const isDrop = event.type === "price_drop";
  const isIncrease = event.type === "price_increase";
  const isRemoved = event.type === "removed";
  const isReappeared = event.type === "reappeared";

  let headline = "Tracking started";
  if (event.type === "new") headline = `Listed at ${formatPrice(event.price)}`;
  if (isReappeared) headline = `Back on market at ${formatPrice(event.price)}`;
  if (isDrop) headline = `Dropped ${formatPrice(Math.abs(event.priceDelta))} -> ${formatPrice(event.price)}`;
  if (isIncrease) headline = `Raised ${formatPrice(Math.abs(event.priceDelta))} -> ${formatPrice(event.price)}`;
  if (isRemoved) headline = "Went off market";

  let dotClass = "ld-timeline-dot";
  if (isDrop) dotClass += " drop";
  else if (isIncrease) dotClass += " rise";
  else if (isRemoved) dotClass += " removed";
  else dotClass += " accent";

  return (
    <div className="ld-timeline-event">
      <div className="ld-timeline-rail">
        <div className={dotClass} />
        {isLast ? null : <div className="ld-timeline-line" />}
      </div>
      <div className={`ld-timeline-body${isLast ? " last" : ""}`}>
        <div className="ld-timeline-headline">{headline}</div>
        <div className="ld-timeline-time">{formatEventTimestamp(event.at)}</div>
      </div>
    </div>
  );
}

export function PriceChart({ priceHistory }) {
  const points = useMemo(() => {
    if (!Array.isArray(priceHistory)) return [];
    return priceHistory
      .filter((event) => Number.isFinite(event?.price) && event.at)
      .map((event) => {
        const time = new Date(String(event.at).replace(" ", "T")).getTime();
        return Number.isFinite(time) ? { t: time, price: event.price, type: event.type } : null;
      })
      .filter(Boolean)
      .sort((left, right) => left.t - right.t);
  }, [priceHistory]);

  if (points.length < 2) {
    return (
      <div className="ld-chart-empty">
        <div className="ld-chart-empty-icon">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 4 4 5-5" />
          </svg>
        </div>
        <div className="ld-chart-empty-title">
          {points.length === 0 ? "No price history yet" : "Just one data point so far"}
        </div>
        <div className="ld-chart-empty-text">
          Refresh this watchlist after the market moves to start drawing the curve.
        </div>
      </div>
    );
  }

  const innerWidth = Math.max(1, CHART_WIDTH - CHART_PAD_LEFT - CHART_PAD_RIGHT);
  const innerHeight = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;
  const minT = points[0].t;
  const maxT = points[points.length - 1].t;
  const tSpan = Math.max(1, maxT - minT);

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  for (const point of points) {
    if (point.price < minPrice) minPrice = point.price;
    if (point.price > maxPrice) maxPrice = point.price;
  }

  const priceSpanRaw = maxPrice - minPrice;
  const pricePadding = priceSpanRaw === 0 ? Math.max(1, Math.abs(maxPrice) * 0.05) : priceSpanRaw * 0.18;
  const minY = minPrice - pricePadding;
  const maxY = maxPrice + pricePadding;
  const yRange = Math.max(1, maxY - minY);

  const xFor = (time) => CHART_PAD_LEFT + ((time - minT) / tSpan) * innerWidth;
  const yFor = (price) => CHART_PAD_TOP + (1 - (price - minY) / yRange) * innerHeight;

  function buildSmoothPath(pathPoints) {
    if (pathPoints.length < 2) return "";

    let path = `M ${xFor(pathPoints[0].t).toFixed(2)} ${yFor(pathPoints[0].price).toFixed(2)}`;
    for (let index = 0; index < pathPoints.length - 1; index += 1) {
      const current = pathPoints[index];
      const next = pathPoints[index + 1];
      const x0 = xFor(current.t);
      const y0 = yFor(current.price);
      const x1 = xFor(next.t);
      const y1 = yFor(next.price);
      const midX = (x0 + x1) / 2;
      path += ` C ${midX.toFixed(2)} ${y0.toFixed(2)}, ${midX.toFixed(2)} ${y1.toFixed(2)}, ${x1.toFixed(2)} ${y1.toFixed(2)}`;
    }
    return path;
  }

  const linePath = buildSmoothPath(points);
  const baselineY = (CHART_PAD_TOP + innerHeight).toFixed(2);
  const areaPath = `${linePath} L ${xFor(maxT).toFixed(2)} ${baselineY} L ${xFor(minT).toFixed(2)} ${baselineY} Z`;
  const gridLines = [0, 0.33, 0.66, 1].map((fraction) => CHART_PAD_TOP + fraction * innerHeight);
  const firstDate = new Date(minT).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const lastDate = new Date(maxT).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <div className="ld-chart">
      <div className="ld-chart-header">
        <div className="ld-chart-stat">
          <Eyebrow>HIGH</Eyebrow>
          <div className="ld-chart-stat-value">{formatPrice(maxPrice)}</div>
        </div>
        <div className="ld-chart-stat center">
          <Eyebrow>RANGE</Eyebrow>
          <div className="ld-chart-stat-value">{formatPrice(maxPrice - minPrice)}</div>
        </div>
        <div className="ld-chart-stat end">
          <Eyebrow>LOW</Eyebrow>
          <div className="ld-chart-stat-value">{formatPrice(minPrice)}</div>
        </div>
      </div>

      <svg className="ld-chart-svg" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
        {gridLines.map((y, index) => (
          <line
            key={`grid-${index}`}
            x1={CHART_PAD_LEFT}
            y1={y}
            x2={CHART_WIDTH - CHART_PAD_RIGHT}
            y2={y}
            className="ld-chart-grid"
            strokeDasharray="2,5"
          />
        ))}

        <path d={areaPath} className="ld-chart-area" />
        <path d={linePath} className="ld-chart-line" />

        {points.map((point, index) => {
          const cx = xFor(point.t);
          const cy = yFor(point.price);
          const isDrop = point.type === "price_drop";
          const isRise = point.type === "price_increase";
          const dotClass = isDrop ? "ld-chart-dot drop" : isRise ? "ld-chart-dot rise" : "ld-chart-dot";
          const isEnd = index === 0 || index === points.length - 1;
          return (
            <circle
              key={`dot-${index}`}
              cx={cx}
              cy={cy}
              r={isEnd ? 5 : 3.5}
              className={dotClass}
            />
          );
        })}

        <text x={CHART_PAD_LEFT} y={CHART_HEIGHT - 10} className="ld-chart-axis">
          {firstDate.toUpperCase()}
        </text>
        <text
          x={CHART_WIDTH - CHART_PAD_RIGHT}
          y={CHART_HEIGHT - 10}
          className="ld-chart-axis"
          textAnchor="end"
        >
          {lastDate.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}

export function ActivityTimeline({ events, isTracked }) {
  if (isTracked && events.length > 0) {
    return (
      <div className="ld-timeline">
        {events.map((event, index) => (
          <TimelineEvent
            key={`${event.type}-${event.at || index}-${index}`}
            event={event}
            isLast={index === events.length - 1}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="ld-activity-empty">
      {isTracked
        ? "Tracking has started. Refresh this watchlist after the market moves to fill out the activity log."
        : "Track this unit, then refresh after the market moves to fill out the activity log."}
    </div>
  );
}

export function daysBetween(start, end) {
  const startTime = start ? new Date(String(start).replace(" ", "T")).getTime() : NaN;
  const endTime = end ? new Date(String(end).replace(" ", "T")).getTime() : NaN;
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null;
  return Math.max(0, Math.round((endTime - startTime) / (1000 * 60 * 60 * 24)));
}
