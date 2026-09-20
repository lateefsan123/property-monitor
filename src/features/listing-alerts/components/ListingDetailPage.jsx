import { useState } from "react";
import {
  formatArea,
  formatBedsAndBaths,
  formatPrice,
} from "../formatters";
import {
  ActivityTimeline,
  ExternalLinkIcon,
  PriceChart,
  PriceDeltaChip,
} from "./ListingDetailParts";

import '../../../styles/listing-detail-chart-first.css';

const DETAIL_TABS = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
];

export default function ListingDetailPage({
  listing,
  onOpenExternal,
  onToggleTracking,
  autoTracking = false,
}) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!listing) return null;

  const isTracked = Boolean(listing.isTracked);
  const isRemoved = listing.currentStatus === "removed";
  const currentPrice = isRemoved
    ? null
    : listing.currentPrice ?? listing.price ?? listing.lastKnownPrice ?? null;
  const lastKnownPrice = listing.lastKnownPrice ?? listing.price ?? listing.currentPrice ?? null;

  const bedsBaths = formatBedsAndBaths(listing.beds, listing.baths).replace(' | ', ' · ');
  const area = formatArea(listing.areaSqft);
  const reversedHistory = (listing.priceHistory || []).slice().reverse();
  const hasCover = Boolean(listing.coverPhoto);

  return (
    <div className="ld-page ld-chart-first">
      <div className="ld-scroll">
        <header className="ld-summary">
        {hasCover ? (
          <div className="ld-hero">
            <img className="ld-hero-img" src={listing.coverPhoto} alt="" />
          </div>
        ) : null}

        <div className="ld-heading">
          <h1 className="ld-title">{listing.buildingName || "Untitled building"}</h1>
          <div className="ld-area">{[bedsBaths, area].filter(Boolean).join(' · ')}</div>
        </div>

          <div className="ld-actions">
            {!autoTracking ? (
              <button
                type="button"
                className={`btn-sm${isTracked ? "" : " btn-primary"}`}
                onClick={onToggleTracking}
              >
                {isTracked ? "Stop tracking" : "Track unit"}
              </button>
            ) : null}
            {listing.bayutUrl ? (
              <button type="button" className="btn-sm" onClick={onOpenExternal}>
                Open on Bayut
                <ExternalLinkIcon size={13} />
              </button>
            ) : null}
          </div>
        </header>

        <div className="ld-price-toolbar">
        <div className="ld-price-hero">
          {isRemoved ? <span className="ld-removed-note">Off market · Last known price</span> : null}
          <div className="ld-price-row">
            <div className="ld-price-value">
              {isRemoved ? formatPrice(lastKnownPrice) : formatPrice(currentPrice)}
            </div>
            {!isRemoved ? <PriceDeltaChip priceDelta={listing.priceDelta} /> : null}
          {Number.isFinite(listing.previousPrice) && !isRemoved ? (
            <s className="ld-price-prev" aria-label={`Previous price ${formatPrice(listing.previousPrice)}`}>{formatPrice(listing.previousPrice)}</s>
          ) : null}
          </div>
        </div>

        <div className="ld-tabs-wrap">
          <div className="ld-tabs" role="tablist" aria-label="Listing history">
            {DETAIL_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`listing-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls="listing-history-panel"
                tabIndex={activeTab === tab.id ? 0 : -1}
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const next = event.key === "Home" ? "overview" : event.key === "End" ? "activity" : activeTab === "overview" ? "activity" : "overview";
                  setActiveTab(next);
                  event.currentTarget.parentElement.querySelector(`#listing-tab-${next}`)?.focus();
                }}
                className={`tab${activeTab === tab.id ? " active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        </div>

        <div id="listing-history-panel" role="tabpanel" aria-labelledby={`listing-tab-${activeTab}`}>
        {activeTab === "overview" ? (
            <div className="ld-section ld-chart-section">
              <PriceChart priceHistory={listing.priceHistory} />
            </div>
        ) : (
          <div className="ld-section ld-activity">
            <ActivityTimeline events={reversedHistory} isTracked={isTracked} />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
