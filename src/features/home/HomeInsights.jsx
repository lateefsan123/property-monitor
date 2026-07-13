import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconBuildingSkyscraper, IconX } from "@tabler/icons-react";
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
import { requestOpenListing } from "../listing-alerts/open-listing-request";
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

function PriceDropRow({ item, onOpen }) {
  const metaParts = [
    item.beds === 0 ? "Studio" : Number.isFinite(item.beds) ? `${item.beds} bed` : null,
    Number.isFinite(item.areaSqft) ? formatArea(item.areaSqft) : null,
    item.verifiedAt ? formatListingTimestamp(item.verifiedAt) : null,
  ].filter(Boolean);

  return (
    <button type="button" className="home-drop-row" onClick={() => onOpen(item)}>
      <span className="home-drop-icon" aria-hidden="true">
        {item.coverPhoto ? (
          <img src={item.coverPhoto} alt="" loading="lazy" />
        ) : (
          <IconBuildingSkyscraper size={18} stroke={1.7} />
        )}
      </span>
      <span className="home-drop-body">
        <span className="home-drop-building">{item.buildingName}</span>
        {item.title && item.title !== "Untitled listing" && (
          <span className="home-drop-title" title={item.title}>{item.title}</span>
        )}
        <span className="home-drop-meta">{metaParts.join(" - ")}</span>
      </span>
      <span className="home-drop-pricing">
        <span className="home-drop-price">{formatPrice(item.price)}</span>
        <PriceDeltaChip priceDelta={item.priceDelta} />
      </span>
    </button>
  );
}

function PriceDropsModal({ drops, onClose, onOpen }) {
  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="home-drops-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="home-drops-modal"
        role="dialog"
        aria-modal="true"
        aria-label="All price drops"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="home-drops-modal-head">
          <div className="ld-chart-stat">
            <Eyebrow>Watched buildings - last 14 days</Eyebrow>
            <div className="ld-chart-stat-value">
              {drops.length} price drop{drops.length === 1 ? "" : "s"}
            </div>
          </div>
          <button
            type="button"
            className="home-drops-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <IconX size={18} stroke={2} aria-hidden="true" />
          </button>
        </div>
        <div className="home-drops-modal-body home-drop-list">
          {drops.map((item) => (
            <PriceDropRow key={`${item.locationId}-${item.id}`} item={item} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PriceDropsCard({ userId, onNavigate }) {
  const dropsQuery = useQuery({
    queryKey: ["home", "price-drops", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchListingPriceDrops(userId),
    staleTime: 5 * 60 * 1000,
  });
  const [showAll, setShowAll] = useState(false);

  const drops = dropsQuery.data || [];
  const visibleDrops = drops.slice(0, MAX_PRICE_DROPS);

  // Open the listing's in-app detail page (price trajectory, Bayut link)
  // rather than bouncing straight out to Bayut.
  function openDrop(item) {
    setShowAll(false);
    if (item.locationId && item.id) requestOpenListing(`${item.locationId}:${item.id}`);
    onNavigate?.("listing-alerts");
  }

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
          onClick={() => setShowAll(true)}
          disabled={!drops.length}
        >
          View all{drops.length ? ` (${drops.length})` : ""}
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
            <PriceDropRow key={`${item.locationId}-${item.id}`} item={item} onOpen={openDrop} />
          ))}
          {drops.length > visibleDrops.length && (
            <button type="button" className="home-drop-more" onClick={() => setShowAll(true)}>
              +{drops.length - visibleDrops.length} more
            </button>
          )}
        </div>
      )}

      {showAll && (
        <PriceDropsModal drops={drops} onClose={() => setShowAll(false)} onOpen={openDrop} />
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
