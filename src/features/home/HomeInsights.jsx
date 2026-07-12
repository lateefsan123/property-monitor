import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconBuildingSkyscraper } from "@tabler/icons-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Eyebrow, PriceDeltaChip } from "../listing-alerts/components/ListingDetailParts";
import { formatArea, formatListingTimestamp, formatPrice } from "../listing-alerts/formatters";
import { fetchUserLeads } from "../seller-signal/services";
import { summarizeLeadCadence } from "../seller-signal/lead-utils";
import { sellerLeadsQueryKey } from "../seller-signal/queryKeys";
import {
  buildDailyMessageSeries,
  fetchListingPriceDrops,
  fetchWhatsAppMessageActivity,
  startOfLocalDay,
} from "./home-insight-services";

const MESSAGE_WINDOW_DAYS = 14;
const MAX_PRICE_DROPS = 4;

function PipelineCard({ userId, onNavigate }) {
  const leadsQuery = useQuery({
    queryKey: sellerLeadsQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchUserLeads(userId),
    staleTime: 2 * 60 * 1000,
  });
  const activityQuery = useQuery({
    queryKey: ["home", "whatsapp-activity", userId, MESSAGE_WINDOW_DAYS],
    enabled: Boolean(userId),
    queryFn: () => fetchWhatsAppMessageActivity(userId, MESSAGE_WINDOW_DAYS),
    staleTime: 5 * 60 * 1000,
  });

  const cadence = useMemo(
    () => summarizeLeadCadence(leadsQuery.data?.leads),
    [leadsQuery.data],
  );
  const sentToday = useMemo(() => {
    const series = buildDailyMessageSeries(activityQuery.data, MESSAGE_WINDOW_DAYS);
    return series[series.length - 1]?.count || 0;
  }, [activityQuery.data]);

  if (leadsQuery.isPending || leadsQuery.error) return null;

  return (
    <section className="home-insight-card home-pipeline-card" aria-label="Seller pipeline">
      <div className="home-pipeline-stats">
        <div className="ld-chart-stat">
          <Eyebrow>Due today</Eyebrow>
          <div className="ld-chart-stat-value">{cadence.due}</div>
        </div>
        <div className="ld-chart-stat">
          <Eyebrow>Scheduled</Eyebrow>
          <div className="ld-chart-stat-value">{cadence.scheduled}</div>
        </div>
        <div className="ld-chart-stat">
          <Eyebrow>Sent today</Eyebrow>
          <div className="ld-chart-stat-value">{sentToday}</div>
        </div>
      </div>
      <button
        type="button"
        className="home-insight-link"
        onClick={() => onNavigate?.("sellers")}
      >
        Open sellers
      </button>
    </section>
  );
}

function MessagesChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="ld-chart-tooltip">
      <div className="ld-chart-tooltip-price">
        {point.count} message{point.count === 1 ? "" : "s"}
      </div>
      <div className="ld-chart-tooltip-date">{point.fullLabel}</div>
    </div>
  );
}

function MessagesSentCard({ userId }) {
  const activityQuery = useQuery({
    queryKey: ["home", "whatsapp-activity", userId, MESSAGE_WINDOW_DAYS],
    enabled: Boolean(userId),
    queryFn: () => fetchWhatsAppMessageActivity(userId, MESSAGE_WINDOW_DAYS),
    staleTime: 5 * 60 * 1000,
  });

  const series = useMemo(
    () => buildDailyMessageSeries(activityQuery.data, MESSAGE_WINDOW_DAYS),
    [activityQuery.data],
  );
  const stats = useMemo(() => {
    const totalSent = series.reduce((sum, point) => sum + point.count, 0);
    const busiest = series.reduce(
      (best, point) => (point.count > best.count ? point : best),
      { count: 0 },
    );
    const todayKey = startOfLocalDay().toDateString();
    const todayCount = series.find((point) => point.key === todayKey)?.count || 0;
    return { totalSent, busiest, todayCount };
  }, [series]);

  return (
    <section className="home-insight-card" aria-label="WhatsApp messages sent">
      <div className="home-insight-head">
        <div className="ld-chart-stat">
          <Eyebrow>Sent - last {MESSAGE_WINDOW_DAYS} days</Eyebrow>
          <div className="ld-chart-stat-value">{stats.totalSent}</div>
        </div>
        <div className="ld-chart-stat center">
          <Eyebrow>Busiest day</Eyebrow>
          <div className="ld-chart-stat-value">
            {stats.busiest.count > 0 ? `${stats.busiest.count} - ${stats.busiest.label}` : "-"}
          </div>
        </div>
        <div className="ld-chart-stat end">
          <Eyebrow>Today</Eyebrow>
          <div className="ld-chart-stat-value">{stats.todayCount}</div>
        </div>
      </div>

      {activityQuery.isPending ? (
        <div className="home-insight-empty">Loading activity...</div>
      ) : activityQuery.error ? (
        <div className="home-insight-empty">Could not load message activity.</div>
      ) : stats.totalSent === 0 ? (
        <div className="home-insight-empty">
          No WhatsApp messages sent in the last {MESSAGE_WINDOW_DAYS} days.
        </div>
      ) : (
        <div className="home-insight-chart">
          <ResponsiveContainer width="100%" height={168}>
            <BarChart data={series} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
              <CartesianGrid
                vertical={false}
                stroke="var(--bg-card-border)"
                strokeDasharray="2 5"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
                minTickGap={24}
                tick={{ fill: "var(--text-faint)", fontSize: 11 }}
                className="ld-chart-axis"
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tickCount={3}
                tick={{ fill: "var(--text-faint)", fontSize: 11 }}
              />
              <Tooltip
                content={<MessagesChartTooltip />}
                cursor={{ fill: "var(--bg-hover)" }}
                wrapperStyle={{ outline: "none" }}
              />
              <Bar
                dataKey="count"
                fill="var(--stat-value)"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function PriceDropRow({ item }) {
  const metaParts = [
    item.beds === 0 ? "Studio" : Number.isFinite(item.beds) ? `${item.beds} bed` : null,
    Number.isFinite(item.areaSqft) ? formatArea(item.areaSqft) : null,
    item.verifiedAt ? formatListingTimestamp(item.verifiedAt) : null,
  ].filter(Boolean);

  const content = (
    <>
      <span className="home-drop-icon" aria-hidden="true">
        {item.coverPhoto ? (
          <img src={item.coverPhoto} alt="" loading="lazy" />
        ) : (
          <IconBuildingSkyscraper size={18} stroke={1.7} />
        )}
      </span>
      <span className="home-drop-body">
        <span className="home-drop-building">{item.buildingName}</span>
        <span className="home-drop-meta">{metaParts.join(" - ") || item.title}</span>
      </span>
      <span className="home-drop-pricing">
        <span className="home-drop-price">{formatPrice(item.price)}</span>
        <PriceDeltaChip priceDelta={item.priceDelta} />
      </span>
    </>
  );

  if (item.bayutUrl) {
    return (
      <a className="home-drop-row" href={item.bayutUrl} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return <div className="home-drop-row">{content}</div>;
}

function PriceDropsCard({ userId, onNavigate }) {
  const dropsQuery = useQuery({
    queryKey: ["home", "price-drops", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchListingPriceDrops(userId),
    staleTime: 5 * 60 * 1000,
  });

  const drops = dropsQuery.data || [];
  const visibleDrops = drops.slice(0, MAX_PRICE_DROPS);

  return (
    <section className="home-insight-card" aria-label="Listing price drops">
      <div className="home-insight-head">
        <div className="ld-chart-stat">
          <Eyebrow>Watched buildings - last 14 days</Eyebrow>
          <div className="ld-chart-stat-value">Price drops</div>
        </div>
        <button
          type="button"
          className="home-insight-link"
          onClick={() => onNavigate?.("listing-alerts")}
        >
          View all
        </button>
      </div>

      {dropsQuery.isPending ? (
        <div className="home-insight-empty">Checking watched listings...</div>
      ) : dropsQuery.error ? (
        <div className="home-insight-empty">Could not load price drops.</div>
      ) : visibleDrops.length === 0 ? (
        <div className="home-insight-empty">
          No price drops on your watched listings yet.
        </div>
      ) : (
        <div className="home-drop-list">
          {visibleDrops.map((item) => (
            <PriceDropRow key={`${item.locationId}-${item.id}`} item={item} />
          ))}
          {drops.length > visibleDrops.length && (
            <div className="home-drop-more">
              +{drops.length - visibleDrops.length} more in Listing Alerts
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function HomeInsights({ userId, onNavigate }) {
  return (
    <div className="home-insights">
      <PipelineCard userId={userId} onNavigate={onNavigate} />
      <MessagesSentCard userId={userId} />
      <PriceDropsCard userId={userId} onNavigate={onNavigate} />
    </div>
  );
}
