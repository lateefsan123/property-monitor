import {
  formatArea,
  formatBedsAndBaths,
  formatPrice,
  formatSyncTimestamp,
} from "../formatters";
import {
  ActivityTimeline,
  BackIcon,
  daysBetween,
  ExternalLinkIcon,
  Eyebrow,
  PriceChart,
  PriceDeltaChip,
  StatStrip,
} from "./ListingDetailParts";

const HERO_HEIGHT = 320;

export default function ListingDetailPage({
  listing,
  onBack,
  onOpenExternal,
  onToggleTracking,
  autoTracking = false,
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
    autoTracking ? "Auto-tracked unit" : (isTracked ? "Tracked unit" : "Live unit"),
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
            {!autoTracking ? (
              <button
                type="button"
                className={`btn-sm${isTracked ? "" : " btn-primary"}`}
                onClick={onToggleTracking}
              >
                {isTracked ? "Stop tracking" : "Track unit"}
              </button>
            ) : (
              <span className="ld-auto-track">Tracking all units in this building</span>
            )}
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
                value: daysTracked == null ? "-" : String(daysTracked),
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
          <ActivityTimeline events={reversedHistory} isTracked={isTracked} />
        </div>
      </div>
    </div>
  );
}
