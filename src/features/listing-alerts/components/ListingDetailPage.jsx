import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconBookmark,
  IconBookmarkFilled,
  IconBuildingSkyscraper,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { supabase } from "../../../supabase";
import {
  formatArea,
  formatPrice,
} from "../formatters";
import { getRecentPriceDrop } from "../price-drop-utils";
import {
  ActivityTimeline,
  ExternalLinkIcon,
  PriceChart,
  PriceDeltaChip,
} from "./ListingDetailParts";

import '../../../styles/listing-detail-clean.css';

// Apartment details follow the mobile listing screen: photo gallery, price
// with the recent drop, a facts line with expandable listing text, then Price
// history / Activity. On desktop the building, key facts and actions sit in a
// sticky side card instead of the mobile bottom bar.
const DETAIL_TABS = [
  { id: "price", label: "Price history" },
  { id: "activity", label: "Activity" },
];

function PhotoGallery({ photos, buildingName }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(() => new Set());
  const visible = photos.filter((url) => !failed.has(url));
  const current = Math.min(index, Math.max(0, visible.length - 1));

  if (!visible.length) {
    return (
      <div className="lp-gallery is-empty" aria-label="No photos available">
        <IconBuildingSkyscraper size={32} stroke={1.5} aria-hidden="true" />
        <span>No photos for this listing</span>
      </div>
    );
  }

  const markFailed = (url) => setFailed((previous) => new Set(previous).add(url));
  const go = (next) => setIndex(Math.max(0, Math.min(visible.length - 1, next)));

  return (
    <div className="lp-gallery">
      <img
        key={visible[current]}
        src={visible[current]}
        alt={`${buildingName || "Listing"} photo ${current + 1} of ${visible.length}`}
        onError={() => markFailed(visible[current])}
      />
      {visible.length > 1 && (
        <div className="lp-gallery-nav">
          <button type="button" aria-label="Previous photo" disabled={current === 0} onClick={() => go(current - 1)}>
            <IconChevronLeft size={18} stroke={2} aria-hidden="true" />
          </button>
          <span aria-live="polite">{current + 1} / {visible.length}</span>
          <button type="button" aria-label="Next photo" disabled={current === visible.length - 1} onClick={() => go(current + 1)}>
            <IconChevronRight size={18} stroke={2} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function ListingDetailPage({
  listing,
  onOpenExternal,
  onToggleTracking,
  autoTracking = false,
}) {
  const [activeTab, setActiveTab] = useState("price");
  const [showDetails, setShowDetails] = useState(false);

  const gallery = useQuery({
    queryKey: ["listing-photos", listing?.id],
    enabled: Boolean(listing?.id) && /^\d{1,20}$/.test(String(listing?.id)),
    staleTime: 60 * 60_000,
    gcTime: 60 * 60_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.functions.invoke("listing-photos", { body: { listingId: String(listing.id) }, signal });
      if (error) throw error;
      return Array.isArray(data?.photos) ? data.photos : [];
    },
  });

  if (!listing) return null;

  const isTracked = Boolean(listing.isTracked);
  const isRemoved = listing.currentStatus === "removed";
  const currentPrice = isRemoved
    ? null
    : listing.currentPrice ?? listing.price ?? listing.lastKnownPrice ?? null;
  const lastKnownPrice = listing.lastKnownPrice ?? listing.price ?? listing.currentPrice ?? null;
  const shownPrice = isRemoved ? lastKnownPrice : currentPrice;
  const recentDrop = getRecentPriceDrop(listing);
  const area = formatArea(listing.areaSqft);
  const history = listing.priceHistory || [];
  const reversedHistory = history.slice().reverse();
  const firstSeen = history.reduce((earliest, event) => {
    const time = new Date(String(event?.at || "").replace(" ", "T")).getTime();
    return Number.isFinite(time) && (!earliest || time < earliest) ? time : earliest;
  }, null);
  const priceChanges = history.filter((event) => event?.type === "price_drop" || event?.type === "price_increase").length;
  const pricePerSqft = Number.isFinite(shownPrice) && Number(listing.areaSqft) > 0
    ? `AED ${Math.round(shownPrice / Number(listing.areaSqft)).toLocaleString("en-US")}`
    : null;
  const photos = [...new Set([listing.coverPhoto, ...(listing.photos || []), ...(gallery.data || [])]
    .filter((url) => typeof url === "string" && /^https?:\/\//.test(url)))];

  const facts = [
    { label: "Bedrooms", value: Number.isFinite(Number(listing.beds)) && listing.beds !== null ? (Number(listing.beds) === 0 ? "Studio" : listing.beds) : null },
    { label: "Bathrooms", value: listing.baths ?? null },
    { label: "Size", value: area || null },
    { label: "Price per sqft", value: pricePerSqft },
    { label: "Price changes", value: history.length ? String(priceChanges) : null },
    { label: "First seen", value: firstSeen ? new Date(firstSeen).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null },
  ].filter((fact) => fact.value !== null && fact.value !== undefined && fact.value !== "");


  return (
    <div className="lp-page">
      <div className="lp-top">
        <PhotoGallery photos={photos} buildingName={listing.buildingName} />

        <aside className="lp-card">
          <h1 className="lp-card-title">{listing.buildingName || "Untitled building"}</h1>

          <div className="lp-card-scroll">
            <section className="lp-price">
              {isRemoved && <span className="lp-removed">Off market · Last known price</span>}
              <div className="lp-price-row">
                <span className="lp-price-value">{formatPrice(shownPrice)}</span>
                {!isRemoved && <PriceDeltaChip priceDelta={recentDrop.hasDrop ? recentDrop.priceDelta : listing.priceDelta} />}
              </div>
              {listing.title && (
                <>
                  {showDetails && <p className="lp-description">{listing.title}</p>}
                  <button type="button" className="lp-more" aria-expanded={showDetails} onClick={() => setShowDetails((value) => !value)}>
                    {showDetails ? "Hide details" : "More details"}
                  </button>
                </>
              )}
            </section>

            {facts.length > 0 && (
              <dl className="lp-card-facts">
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="lp-card-actions">
            {!autoTracking && (
              <button type="button" className={`lp-btn${isTracked ? " is-secondary" : ""}`} onClick={onToggleTracking}>
                {isTracked ? <IconBookmarkFilled size={17} aria-hidden="true" /> : <IconBookmark size={17} stroke={1.8} aria-hidden="true" />}
                {isTracked ? "Stop tracking" : "Track listing"}
              </button>
            )}
            {listing.bayutUrl && (
              <button type="button" className={`lp-btn${autoTracking ? "" : " is-secondary"}`} onClick={onOpenExternal}>
                <ExternalLinkIcon size={16} />
                Open on Bayut
              </button>
            )}
          </div>
        </aside>
      </div>

      <section className="lp-history">
        <div className="lp-tabs" role="tablist" aria-label="Listing history">
          {DETAIL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`listing-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls="listing-history-panel"
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={activeTab === tab.id ? "is-active" : ""}
              onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === "Home" ? "price" : event.key === "End" ? "activity" : activeTab === "price" ? "activity" : "price";
                setActiveTab(next);
                event.currentTarget.parentElement.querySelector(`#listing-tab-${next}`)?.focus();
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div id="listing-history-panel" role="tabpanel" aria-labelledby={`listing-tab-${activeTab}`} className="lp-history-panel">
          {activeTab === "price"
            ? <PriceChart priceHistory={listing.priceHistory} />
            : <ActivityTimeline events={reversedHistory} isTracked={isTracked} />}
        </div>
      </section>
    </div>
  );
}
