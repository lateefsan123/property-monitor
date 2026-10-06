import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconBuildingEstate, IconChevronRight, IconX } from "@tabler/icons-react";
import { formatArea, formatPrice } from "../listing-alerts/formatters";
import { requestOpenListing } from "../listing-alerts/open-listing-request";
import { fetchUserLeads } from "../seller-signal/services";
import { summarizeLeadCadence } from "../seller-signal/lead-utils";
import { sellerLeadsQueryKey } from "../seller-signal/queryKeys";
import { integrationRequest } from "../../integration-client";
import { integrationStatusOptions } from "../../integration-query";
import { useEmailSummary } from "../../../shared/use-email-summary";
import HomeMessageShortcut from "./HomeMessageShortcut";
import HomeActivity from "./HomeActivity";
import { CalendarToday, EmailBrief, HomeConnectionPrompt } from "./HomeConnect";
import { openSetupAction } from "./setup-actions";
import { buildDailyMessageSeries, fetchListingPriceDrops, fetchWhatsAppMessageActivity } from "./home-insight-services";

// Uses mobile Home's look (mobile/src/workspace/home.js) in a desktop layout:
// the summary card across the top, then activity, price drops, email and
// calendar as side-by-side cards instead of mobile's tabs.
const WINDOW_DAYS = 14;

function DropRow({ item, onOpen }) {
  const meta = [item.beds === 0 ? "Studio" : Number.isFinite(item.beds) && item.beds ? `${item.beds} bed` : null, Number.isFinite(item.areaSqft) ? formatArea(item.areaSqft) : null].filter(Boolean);
  return (
    <button type="button" className="home-drop" onClick={() => onOpen(item)} aria-label={`Open ${item.buildingName}, ${item.title || "listing"}`}>
      <span className="home-drop-thumb" aria-hidden="true">
        {item.coverPhoto ? <img src={item.coverPhoto} alt="" loading="lazy" /> : <IconBuildingEstate size={22} stroke={1.7} />}
      </span>
      <span className="home-drop-text"><strong>{item.buildingName}</strong><span className="home-muted home-small">{meta.join(" · ")}</span></span>
      <span className="home-drop-price"><strong>{formatPrice(item.price)}</strong><span className="home-drop-delta">↓ {formatPrice(Math.abs(item.priceDelta || 0))}</span></span>
    </button>
  );
}

function AllDropsDialog({ drops, onClose, onOpen }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="home-drops-modal-overlay" role="presentation" onClick={onClose}>
      <div className="home-drops-modal" role="dialog" aria-modal="true" aria-label="All price drops" onClick={(event) => event.stopPropagation()}>
        <div className="home-drops-modal-head">
          <div><span className="home-muted home-small">Last 14 days</span><h3>{drops.length} price drop{drops.length === 1 ? "" : "s"}</h3></div>
          <button type="button" className="home-drops-modal-close" onClick={onClose} aria-label="Close"><IconX size={18} stroke={2} aria-hidden="true" /></button>
        </div>
        <div className="home-drops-modal-body">{drops.map((item) => <DropRow key={`${item.locationId}-${item.id}`} item={item} onOpen={onOpen} />)}</div>
      </div>
    </div>
  );
}

function PriceDrops({ query, onNavigate }) {
  const [showAll, setShowAll] = useState(false);
  const drops = query.data || [];
  function open(item) {
    setShowAll(false);
    if (item.locationId && item.id) requestOpenListing(`${item.locationId}:${item.id}`);
    onNavigate?.("listing-alerts");
  }
  return (
    <div className="home-drops">
      <div className="home-drops-head">
        <span className="home-muted home-small">Last 14 days</span>
        <button type="button" className="home-text-button" disabled={!drops.length} onClick={() => setShowAll(true)}>View all</button>
      </div>
      {query.isPending && <p className="home-muted" role="status">Checking watched listings…</p>}
      {drops.slice(0, 5).map((item) => <DropRow key={`${item.locationId}-${item.id}`} item={item} onOpen={open} />)}
      {!query.isPending && !query.error && !drops.length && <p className="home-muted home-empty">No recent drops in your watched buildings.</p>}
      {showAll && <AllDropsDialog drops={drops} onClose={() => setShowAll(false)} onOpen={open} />}
    </div>
  );
}

export default function HomeInsights({ userId, onNavigate, onOpenSeller }) {
  const [days, setDays] = useState(WINDOW_DAYS);
  const connections = useQuery(integrationStatusOptions(userId, integrationRequest));
  const hasEmail = connections.data?.some((item) => item.feature === "email" && item.connected) || false;
  const emailSummary = useEmailSummary({ userId, connected: hasEmail, request: integrationRequest });
  const emailConnected = connections.data ? hasEmail : emailSummary.data?.connected;
  const emailReady = connections.data !== undefined || emailSummary.data !== undefined;
  const leads = useQuery({ queryKey: sellerLeadsQueryKey(userId), enabled: Boolean(userId), queryFn: () => fetchUserLeads(userId), staleTime: 2 * 60 * 1000 });
  const activity = useQuery({ queryKey: ["home", "whatsapp-activity", userId, WINDOW_DAYS], enabled: Boolean(userId), queryFn: () => fetchWhatsAppMessageActivity(userId, WINDOW_DAYS), staleTime: 5 * 60 * 1000 });
  const drops = useQuery({ queryKey: ["home", "price-drops", userId], enabled: Boolean(userId), queryFn: () => fetchListingPriceDrops(userId), staleTime: 5 * 60 * 1000 });
  const series = buildDailyMessageSeries(activity.data, WINDOW_DAYS);
  const cadence = summarizeLeadCadence(leads.data?.leads);
  const leadsReady = Boolean(leads.data);
  const noSellers = leadsReady && !(leads.data.leads || []).length;
  const activityReady = Boolean(activity.data);
  const failure = leads.error || activity.error || drops.error;
  const metrics = [
    { label: "Due today", value: leadsReady ? cadence.due : "—", action: () => onNavigate?.("sellers") },
    { label: "Scheduled", value: leadsReady ? cadence.scheduled : "—", action: () => onNavigate?.("schedule") },
    { label: "Sent today", value: activityReady ? series[series.length - 1]?.count || 0 : "—", action: () => document.querySelector(".home-activity")?.scrollIntoView({ behavior: "smooth", block: "center" }) },
  ];
  return (
    <>
      {failure && (
        <p className="home-error" role="alert">{failure.message || "Could not load your overview."}{" "}
          <button type="button" className="home-text-button" onClick={() => { leads.refetch(); activity.refetch(); drops.refetch(); }}>Try again</button>
        </p>
      )}
      <div className="home-layout">
      <div className="home-main">
      <section className="home-summary" aria-label="Seller pipeline" aria-busy={leads.isPending}>
        <div className="home-summary-metrics">
          {metrics.map((metric) => (
            <button key={metric.label} type="button" className="home-summary-metric" onClick={metric.action} aria-label={`${metric.label}: ${metric.value}`}>
              <span className="home-muted home-small">{metric.label}</span>
              <strong>{metric.value}</strong>
            </button>
          ))}
        </div>
        <button type="button" className="home-summary-link" onClick={() => (noSellers ? openSetupAction({ id: "import" }, onNavigate) : onNavigate?.("sellers"))}>
          <span>{noSellers ? "Import your sellers to get started" : leadsReady && cadence.due === 0 ? "All caught up · View sellers" : "View sellers"}</span>
          <IconChevronRight size={17} stroke={2} aria-hidden="true" />
        </button>
      </section>
        <section className="home-card" aria-label="Messages sent">
          <HomeActivity series={series} days={days} onDaysChange={setDays} ready={activityReady} loading={activity.isPending} />
        </section>
        <section className="home-card" aria-labelledby="home-drops-title">
          <h2 id="home-drops-title" className="home-card-title">Price drops</h2>
          <PriceDrops query={drops} onNavigate={onNavigate} />
        </section>
      </div>
      {/* Today's calendar and email sit in a right rail from the top of the
          page (after Charma's home, Mobbin 68685623) so they need no scroll. */}
      <aside className="home-rail" aria-label="Today">
        <section className="home-card" aria-label="Calendar">
          <CalendarToday userId={userId} connections={connections.data} connectionError={connections.error} retryConnections={connections.refetch} />
        </section>
        <HomeMessageShortcut userId={userId} onNavigate={onNavigate} onOpenSeller={(sellerId) => onOpenSeller?.(sellerId, "history")} />
        <section className="home-card" aria-label="Email">
          {emailReady && !emailConnected
            ? <HomeConnectionPrompt feature="email" connections={connections.data} />
            : <EmailBrief query={emailSummary} connectedProviders={connections.data ? connections.data.filter((item) => item.feature === "email" && item.connected).map((item) => item.provider) : emailSummary.data?.providers || []} />}
        </section>
      </aside>
      </div>
    </>
  );
}
