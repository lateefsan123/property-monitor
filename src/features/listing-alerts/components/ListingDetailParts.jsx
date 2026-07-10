import { useMemo } from "react";
import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowUp,
  IconChartLine,
  IconExternalLink,
} from "@tabler/icons-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEventTimestamp, formatPrice } from "../formatters";

export function ExternalLinkIcon({ size = 16 }) {
  return <IconExternalLink size={size} stroke={2} aria-hidden="true" />;
}

function ArrowIcon({ direction = "down", size = 14 }) {
  const Icon = direction === "down" ? IconArrowDown : IconArrowUp;
  return <Icon size={size} stroke={3} aria-hidden="true" />;
}

export function BackIcon({ size = 22 }) {
  return <IconArrowLeft size={size} stroke={2} aria-hidden="true" />;
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

function formatChartDate(value) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase();
}

function parseChartTime(value) {
  const time = new Date(String(value || "").replace(" ", "T")).getTime();
  return Number.isFinite(time) ? time : null;
}

function PriceChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="ld-chart-tooltip">
      <div className="ld-chart-tooltip-price">{formatPrice(point.price)}</div>
      <div className="ld-chart-tooltip-date">{formatEventTimestamp(point.at)}</div>
    </div>
  );
}

function PriceChartDot({ cx, cy, payload, index, dataLength }) {
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  const isDrop = payload?.type === "price_drop";
  const isRise = payload?.type === "price_increase";
  const isEnd = index === 0 || index === dataLength - 1;
  const className = isDrop ? "ld-chart-dot drop" : isRise ? "ld-chart-dot rise" : "ld-chart-dot";

  return <circle cx={cx} cy={cy} r={isEnd ? 5 : 3.5} className={className} />;
}

export function PriceChart({ priceHistory }) {
  const chart = useMemo(() => {
    if (!Array.isArray(priceHistory)) return [];
    const points = priceHistory
      .flatMap((event) => {
        const currentTime = parseChartTime(event?.at);
        const currentPrice = Number(event?.price);
        if (!Number.isFinite(currentTime) || !Number.isFinite(currentPrice)) return [];

        const eventPoints = [];
        const previousPrice = Number(event?.previousPrice);
        const hasPreviousPrice =
          (event.type === "price_drop" || event.type === "price_increase") &&
          Number.isFinite(previousPrice);

        if (hasPreviousPrice) {
          const verifiedTime = parseChartTime(event.verifiedAt);
          const previousTime =
            Number.isFinite(verifiedTime) && verifiedTime < currentTime
              ? verifiedTime
              : currentTime - 24 * 60 * 60 * 1000;

          eventPoints.push({
            t: previousTime,
            at: event.verifiedAt || event.at,
            price: previousPrice,
            type: "previous_price",
            dateLabel: formatChartDate(previousTime),
          });
        }

        eventPoints.push({
          t: currentTime,
          at: event.at,
          price: currentPrice,
          type: event.type,
          dateLabel: formatChartDate(currentTime),
        });

        return eventPoints;
      })
      .filter(Boolean)
      .sort((left, right) => left.t - right.t);

    if (!points.length) return { points: [] };

    const prices = points.map((point) => point.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceSpan = maxPrice - minPrice;
    const pricePadding = priceSpan === 0 ? Math.max(1, Math.abs(maxPrice) * 0.05) : priceSpan * 0.18;

    return {
      points,
      minPrice,
      maxPrice,
      minY: minPrice - pricePadding,
      maxY: maxPrice + pricePadding,
      firstDate: formatChartDate(points[0].t),
      lastDate: formatChartDate(points[points.length - 1].t),
    };
  }, [priceHistory]);
  const points = chart.points || [];

  if (points.length < 2) {
    return (
      <div className="ld-chart-empty">
        <div className="ld-chart-empty-icon">
          <IconChartLine size={18} stroke={2} aria-hidden="true" />
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
  const firstTime = points[0].t;
  const lastTime = points[points.length - 1].t;

  return (
    <div className="ld-chart">
      <div className="ld-chart-header">
        <div className="ld-chart-stat">
          <Eyebrow>HIGH</Eyebrow>
          <div className="ld-chart-stat-value">{formatPrice(chart.maxPrice)}</div>
        </div>
        <div className="ld-chart-stat center">
          <Eyebrow>RANGE</Eyebrow>
          <div className="ld-chart-stat-value">{formatPrice(chart.maxPrice - chart.minPrice)}</div>
        </div>
        <div className="ld-chart-stat end">
          <Eyebrow>LOW</Eyebrow>
          <div className="ld-chart-stat-value">{formatPrice(chart.minPrice)}</div>
        </div>
      </div>

      <div className="ld-chart-body">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={points} margin={{ top: 14, right: 18, bottom: 18, left: 18 }}>
            <defs>
              <linearGradient id="listing-price-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--stat-value)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--stat-value)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--bg-card-border)"
              strokeDasharray="2 5"
            />
            <XAxis
              dataKey="t"
              type="number"
              domain={[firstTime, lastTime]}
              ticks={[firstTime, lastTime]}
              interval={0}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              tickFormatter={(value) => formatChartDate(value)}
              className="ld-chart-axis"
            />
            <YAxis
              dataKey="price"
              type="number"
              domain={[chart.minY, chart.maxY]}
              hide
            />
            <Tooltip
              content={<PriceChartTooltip />}
              cursor={{ stroke: "var(--text-faint)", strokeWidth: 1, strokeDasharray: "3 5" }}
              wrapperStyle={{ outline: "none" }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="none"
              fill="url(#listing-price-gradient)"
              isAnimationActive={false}
              activeDot={false}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="var(--stat-value)"
              strokeWidth={2.5}
              dot={(props) => <PriceChartDot {...props} dataLength={points.length} />}
              activeDot={{ r: 6, stroke: "var(--bg-card)", strokeWidth: 2, fill: "var(--stat-value)" }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
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
