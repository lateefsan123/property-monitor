import {
  formatArea,
  formatBedsAndBaths,
  formatListingTimestamp,
  formatPrice,
  formatPriceRange,
} from "../formatters";

function ExternalLinkIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3h7v7" />
      <path d="M10 14L21 3" />
      <path d="M21 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    </svg>
  );
}

function ArrowIcon({ direction = "down", size = 11 }) {
  const d = direction === "down" ? "M12 5v14M5 12l7 7 7-7" : "M12 19V5M5 12l7-7 7 7";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function BellDotIcon({ size = 14, withAccent }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      {withAccent ? <circle cx="19" cy="5" r="3" fill="currentColor" stroke="none" /> : null}
    </svg>
  );
}

function PriceDeltaChip({ priceDelta }) {
  if (!Number.isFinite(priceDelta) || priceDelta === 0) return null;
  const isDrop = priceDelta < 0;
  return (
    <span className={`la-delta-chip ${isDrop ? "la-delta-drop" : "la-delta-rise"}`}>
      <ArrowIcon direction={isDrop ? "down" : "up"} size={11} />
      {formatPrice(Math.abs(priceDelta))}
    </span>
  );
}

function StatusPill({ listing }) {
  const isRemoved = listing.currentStatus === "removed";
  return (
    <span className={`la-status-pill ${isRemoved ? "la-status-removed" : "la-status-active"}`}>
      {isRemoved ? "Off market" : "Active"}
    </span>
  );
}

function TrackingPill() {
  return <span className="la-tracking-pill">Tracking</span>;
}

function WatchButton({ active, disabled, onClick }) {
  return (
    <button
      type="button"
      className={`btn-sm la-watch-btn${active ? " active" : ""}`}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <BellDotIcon withAccent={active} size={13} />
      {active ? "Watching" : "Watch"}
    </button>
  );
}

export function getSearchOptionLabel(option) {
  return option?.buildingName || option?.searchName || "Unknown";
}

export function getSearchOptionMeta(option) {
  const fullPath = String(option?.fullPath || "").trim();
  if (!fullPath) return null;

  const label = getSearchOptionLabel(option).toLowerCase();
  const parts = fullPath.split("|").map((part) => part.trim()).filter(Boolean);
  const remaining = parts.filter((part, index) => index !== 0 || part.toLowerCase() !== label);

  return (remaining.length ? remaining : parts).join(", ");
}

export function BuildingRow({ building, isWatched, watchDisabled, onToggleWatch, onPress, priceDropCount }) {
  const loadedCount = building?.listings?.length || 0;
  const countLine = isWatched
    ? loadedCount
      ? `${loadedCount} ${loadedCount === 1 ? "listing" : "listings"}`
      : "No live listings"
    : building.fullPath || "Bayut location";
  const priceLine = building.fetchError
    ? "Live pricing unavailable"
    : building.lowestPrice != null || building.highestPrice != null
      ? formatPriceRange(building.lowestPrice, building.highestPrice)
      : "Watch to load listings";

  return (
    <tr
      className="lead-row"
      onClick={onPress}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPress();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <td className="lead-cell-name">
        <span className="lead-name">{building.buildingName}</span>
      </td>
      <td className="lead-cell-building">
        <span className="lead-building-label">{countLine}</span>
      </td>
      <td className="la-cell-price">
        {priceLine}
        {priceDropCount > 0 ? (
          <span className="la-drop-indicator">
            <ArrowIcon direction="down" size={10} />
            {priceDropCount} {priceDropCount === 1 ? "drop" : "drops"}
          </span>
        ) : null}
      </td>
      <td className="lead-cell-action" onClick={(event) => event.stopPropagation()}>
        <WatchButton active={isWatched} disabled={watchDisabled} onClick={onToggleWatch} />
      </td>
    </tr>
  );
}

export function ListingHistoryRow({ listing, onPress, onOpenExternal }) {
  const isTracked = Boolean(listing.isTracked);
  const isRemoved = listing.currentStatus === "removed";
  const currentPrice = isRemoved ? listing.lastKnownPrice : listing.price ?? listing.currentPrice ?? listing.lastKnownPrice;
  const statusLine = !isTracked
    ? "Open to choose if this unit should be tracked"
    : isRemoved
      ? `Off market ${listing.removedAt ? formatListingTimestamp(listing.removedAt) : ""}`.trim()
      : listing.totalChanges > 0
        ? `${listing.totalChanges} tracked ${listing.totalChanges === 1 ? "change" : "changes"}`
        : `Tracking since ${formatListingTimestamp(listing.firstSeenAt || listing.verifiedAt)}`;

  return (
    <tr
      className="lead-row"
      onClick={onPress}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPress();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <td className="la-cell-thumb">
        {listing.coverPhoto ? (
          <img className="la-row-thumb" src={listing.coverPhoto} alt="" />
        ) : (
          <div className="la-row-thumb la-row-thumb-placeholder" />
        )}
      </td>
      <td className="lead-cell-name">
        <span className="lead-name">{listing.title || "Untitled listing"}</span>
        {statusLine ? <span className="la-cell-sub">{statusLine}</span> : null}
      </td>
      <td className="lead-cell-building">
        <span className="lead-building-label" title={listing.buildingName}>{listing.buildingName}</span>
      </td>
      <td className="la-cell-details">
        {formatBedsAndBaths(listing.beds, listing.baths)}
        <span className="la-cell-area">{formatArea(listing.areaSqft)}</span>
      </td>
      <td className="la-cell-price">
        <span className="la-cell-price-value">
          {isRemoved ? formatPrice(listing.lastKnownPrice) : formatPriceRange(currentPrice, currentPrice)}
        </span>
        {isTracked && !isRemoved ? <PriceDeltaChip priceDelta={listing.priceDelta} /> : null}
        {isTracked && Number.isFinite(listing.previousPrice) && listing.previousPrice !== currentPrice && !isRemoved ? (
          <span className="la-cell-was">Was {formatPrice(listing.previousPrice)}</span>
        ) : null}
      </td>
      <td className="lead-cell-status">
        {isTracked && listing.currentStatus ? <StatusPill listing={listing} /> : null}
        {isTracked ? <TrackingPill /> : null}
      </td>
      <td className="lead-cell-action" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="btn-sm la-row-external-btn"
          onClick={(event) => {
            event.stopPropagation();
            onOpenExternal();
          }}
        >
          Bayut
          <ExternalLinkIcon size={12} />
        </button>
      </td>
    </tr>
  );
}
