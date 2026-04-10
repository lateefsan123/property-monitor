import { useMemo } from "react";
import {
  formatArea,
  formatBedsAndBaths,
  formatEventTimestamp,
  formatPrice,
  formatSyncTimestamp,
} from "../formatters";

const HERO_HEIGHT = 320;
const CHART_HEIGHT = 220;
const CHART_PAD_LEFT = 16;
const CHART_PAD_RIGHT = 16;
const CHART_PAD_TOP = 24;
const CHART_PAD_BOTTOM = 32;
const CHART_WIDTH = 560;

// ---------- Icons ----------

function ExternalLinkIcon({ size = 16 }) {
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

function BackIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

// ---------- Pieces ----------

function Eyebrow({ children, className = "" }) {
  return <div className={`ld-eyebrow ${className}`}>{children}</div>;
}

function PriceDeltaChip({ priceDelta }) {
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

function StatStrip({ items }) {
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
  if (isDrop) headline = `Dropped ${formatPrice(Math.abs(event.priceDelta))} → ${formatPrice(event.price)}`;
  if (isIncrease) headline = `Raised ${formatPrice(Math.abs(event.priceDelta))} → ${formatPrice(event.price)}`;
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

// ---------- Price chart ----------

function PriceChart({ priceHistory }) {
  const points = useMemo(() => {
    if (!Array.isArray(priceHistory)) return [];
    return priceHistory
      .filter((event) => Number.isFinite(event?.price) && event.at)
      .map((event) => {
        const t = new Date(String(event.at).replace(" ", "T")).getTime();
        return Number.isFinite(t) ? { t, price: event.price, type: event.type } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.t - b.t);
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
  for (const p of points) {
    if (p.price < minPrice) minPrice = p.price;
    if (p.price > maxPrice) maxPrice = p.price;
  }
  const priceSpanRaw = maxPrice - minPrice;
  const pricePadding = priceSpanRaw === 0 ? Math.max(1, Math.abs(maxPrice) * 0.05) : priceSpanRaw * 0.18;
  const minY = minPrice - pricePadding;
  const maxY = maxPrice + pricePadding;
  const yRange = Math.max(1, maxY - minY);

  const xFor = (t) => CHART_PAD_LEFT + ((t - minT) / tSpan) * innerWidth;
  const yFor = (price) => CHART_PAD_TOP + (1 - (price - minY) / yRange) * innerHeight;

  function buildSmoothPath(pts) {
    if (pts.length < 2) return "";
    let d = `M ${xFor(pts[0].t).toFixed(2)} ${yFor(pts[0].price).toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const x0 = xFor(p0.t);
      const y0 = yFor(p0.price);
      const x1 = xFor(p1.t);
      const y1 = yFor(p1.price);
      const midX = (x0 + x1) / 2;
      d += ` C ${midX.toFixed(2)} ${y0.toFixed(2)}, ${midX.toFixed(2)} ${y1.toFixed(2)}, ${x1.toFixed(2)} ${y1.toFixed(2)}`;
    }
    return d;
  }

  const linePath = buildSmoothPath(points);
  const baselineY = (CHART_PAD_TOP + innerHeight).toFixed(2);
  const areaPath = `${linePath} L ${xFor(maxT).toFixed(2)} ${baselineY} L ${xFor(minT).toFixed(2)} ${baselineY} Z`;

  const gridLines = [0, 0.33, 0.66, 1].map((frac) => CHART_PAD_TOP + frac * innerHeight);
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
        {gridLines.map((y, i) => (
          <line
            key={`grid-${i}`}
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

        {points.map((p, i) => {
          const cx = xFor(p.t);
          const cy = yFor(p.price);
          const isDrop = p.type === "price_drop";
          const isRise = p.type === "price_increase";
          const dotClass = isDrop ? "ld-chart-dot drop" : isRise ? "ld-chart-dot rise" : "ld-chart-dot";
          const isEnd = i === 0 || i === points.length - 1;
          return (
            <circle
              key={`dot-${i}`}
              cx={cx}
              cy={cy}
              r={isEnd ? 5 : 3.5}
              className={dotClass}
            />
          );
        })}

        <text
          x={CHART_PAD_LEFT}
          y={CHART_HEIGHT - 10}
          className="ld-chart-axis"
        >
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

// ---------- Page ----------

function daysBetween(start, end) {
  const a = start ? new Date(String(start).replace(" ", "T")).getTime() : NaN;
  const b = end ? new Date(String(end).replace(" ", "T")).getTime() : NaN;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

export default function ListingDetailPage({
  listing,
  onBack,
  onOpenExternal,
  onToggleTracking,
}) {
  if (!listing) return null;

  const isTracked = Boolean(listing.isTracked);
  const isRemoved = listing.currentStatus === "removed";
  const currentPrice = isRemoved
    ? null
    : listing.currentPrice ?? listing.price ?? listing.lastKnownPrice ?? null;
  const lastKnownPrice = listing.lastKnownPrice ?? listing.price ?? listing.currentPrice ?? null;
  const firstSeenAt = listing.firstSeenAt || listing.verifiedAt || null;
  const lastSeenAt = listing.lastSeenAt || listing.removedAt || listing.lastVerifiedAt || listing.verifiedAt || null;
  const daysTracked = daysBetween(firstSeenAt, lastSeenAt || new Date().toISOString());

  const bedsBaths = formatBedsAndBaths(listing.beds, listing.baths);
  const area = formatArea(listing.areaSqft);

  const eyebrowBits = [
    isTracked ? "Tracked unit" : "Live unit",
    listing.community || listing.cluster || null,
    bedsBaths,
  ].filter(Boolean);

  const reversedHistory = (listing.priceHistory || []).slice().reverse();
  const hasCover = Boolean(listing.coverPhoto);

  return (
    <div className="ld-page">
      <div className="ld-scroll">
        <button type="button" className="ld-back-link" onClick={onBack}>
          <BackIcon size={14} />
          Back to Listings
        </button>

        {hasCover ? (
          <div className="ld-hero" style={{ height: HERO_HEIGHT }}>
            <img className="ld-hero-img" src={listing.coverPhoto} alt="" />
            <div className="ld-hero-fade-bottom" />
          </div>
        ) : null}

        <div className={`ld-heading${hasCover ? " overlap" : ""}`}>
          <Eyebrow>{eyebrowBits.join("  ·  ")}</Eyebrow>
          <h1 className="ld-title">{listing.buildingName || "Untitled building"}</h1>
          <div className="ld-subtitle">{listing.title || "Untitled listing"}</div>
          <div className="ld-area">{area}</div>

          <div className="ld-actions">
            <button
              type="button"
              className={`btn-sm${isTracked ? "" : " btn-primary"}`}
              onClick={onToggleTracking}
            >
              {isTracked ? "Stop tracking" : "Track unit"}
            </button>
            {listing.bayutUrl ? (
              <button type="button" className="btn-sm" onClick={onOpenExternal}>
                Open on Bayut
                <ExternalLinkIcon size={13} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="ld-price-hero">
          <Eyebrow>{isRemoved ? "Last known price" : "Current valuation"}</Eyebrow>
          <div className="ld-price-row">
            <div className="ld-price-value">
              {isRemoved ? formatPrice(lastKnownPrice) : formatPrice(currentPrice)}
            </div>
            {!isRemoved ? <PriceDeltaChip priceDelta={listing.priceDelta} /> : null}
          </div>
          {Number.isFinite(listing.previousPrice) && !isRemoved ? (
            <div className="ld-price-prev">{`Previously ${formatPrice(listing.previousPrice)}`}</div>
          ) : null}
        </div>

        <div className="ld-section ld-chart-section">
          <div className="ld-section-eyebrow">
            <Eyebrow>Price trajectory</Eyebrow>
          </div>
          <PriceChart priceHistory={listing.priceHistory} />
        </div>

        <div className="ld-section">
          <div className="ld-section-eyebrow padded">
            <Eyebrow>By the numbers</Eyebrow>
          </div>
          <StatStrip
            items={[
              {
                label: "Drops",
                value: String(listing.dropsCount || 0),
                accentClass: listing.dropsCount ? "drop" : "",
              },
              {
                label: "Rises",
                value: String(listing.increasesCount || 0),
                accentClass: listing.increasesCount ? "rise" : "",
              },
              {
                label: "Changes",
                value: String(listing.totalChanges || 0),
              },
              {
                label: "Days",
                value: daysTracked == null ? "—" : String(daysTracked),
              },
            ]}
          />
          <div className="ld-stat-footnote">
            <span>First seen {formatSyncTimestamp(firstSeenAt)}</span>
            <span>Last seen {formatSyncTimestamp(lastSeenAt)}</span>
          </div>
        </div>

        <div className="ld-section ld-activity">
          <Eyebrow>Activity</Eyebrow>
          {isTracked && reversedHistory.length > 0 ? (
            <div className="ld-timeline">
              {reversedHistory.map((event, index) => (
                <TimelineEvent
                  key={`${event.type}-${event.at || index}-${index}`}
                  event={event}
                  isLast={index === reversedHistory.length - 1}
                />
              ))}
            </div>
          ) : (
            <div className="ld-activity-empty">
              {isTracked
                ? "Tracking has started. Refresh this watchlist after the market moves to fill out the activity log."
                : "Track this unit, then refresh after the market moves to fill out the activity log."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
