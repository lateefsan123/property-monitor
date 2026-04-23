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

function FavoriteIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function PinIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 17v5" />
      <path d="M9 3h6l-1 6 4 4H6l4-4-1-6z" />
    </svg>
  );
}

function RowHoverActions({ favorited, pinned, onToggleFavorite, onTogglePin }) {
  function handle(fn) {
    return (event) => {
      event.stopPropagation();
      fn?.();
    };
  }
  return (
    <span className="sheet-row-actions" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`sheet-card-action${favorited ? " is-active" : ""}`}
        onClick={handle(onToggleFavorite)}
        aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        title={favorited ? "Remove from favorites" : "Favorite"}
      >
        <FavoriteIcon filled={favorited} />
      </button>
      <button
        type="button"
        className={`sheet-card-action${pinned ? " is-active" : ""}`}
        onClick={handle(onTogglePin)}
        aria-label={pinned ? "Unpin" : "Pin"}
        title={pinned ? "Unpin" : "Pin"}
      >
        <PinIcon filled={pinned} />
      </button>
    </span>
  );
}

function BuildingIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 9h.01" />
      <path d="M14 9h.01" />
      <path d="M9 13h.01" />
      <path d="M14 13h.01" />
      <path d="M9 17h.01" />
      <path d="M14 17h.01" />
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

export function BuildingRow({ building, isWatched, onPress, priceDropCount, favorited, pinned, onToggleFavorite, onTogglePin }) {
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
  const newListingCount = building?.changeSummary?.newListingCount || 0;

  function handleKey(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPress();
    }
  }

  return (
    <div
      className={`sheet-row la-row la-row-building${pinned ? " is-pinned" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onPress}
      onKeyDown={handleKey}
    >
      <span className="sheet-row-icon la-row-building-icon" aria-hidden>
        <BuildingIcon />
      </span>
      <div className="la-row-primary">
        <span className="la-row-title">
          {building.buildingName}
          {newListingCount > 0 ? (
            <span className="la-new-pill" title={`${newListingCount} new since last check`}>
              {newListingCount} new
            </span>
          ) : null}
        </span>
        <span className="la-row-sub">{countLine}</span>
      </div>
      <div className="la-row-price">
        <span className="la-cell-price-value">{priceLine}</span>
        {priceDropCount > 0 ? (
          <span className="la-drop-indicator">
            <ArrowIcon direction="down" size={10} />
            {priceDropCount} {priceDropCount === 1 ? "drop" : "drops"}
          </span>
        ) : null}
      </div>
      <RowHoverActions
        favorited={favorited}
        pinned={pinned}
        onToggleFavorite={onToggleFavorite}
        onTogglePin={onTogglePin}
      />
    </div>
  );
}

function hashSeed(value) {
  const str = String(value ?? "");
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

const BUILDING_PALETTE = ["#dbeafe", "#ede9fe", "#fce7f3", "#fef3c7", "#ccfbf1", "#ffe4e6", "#e0f2fe"];

function buildingThumbColor(seed) {
  return BUILDING_PALETTE[hashSeed(seed) % BUILDING_PALETTE.length];
}

function CardHoverActions({ favorited, pinned, onToggleFavorite, onTogglePin }) {
  function handle(fn) {
    return (event) => {
      event.stopPropagation();
      fn?.();
    };
  }
  return (
    <div className="sheet-card-actions" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`sheet-card-action${favorited ? " is-active" : ""}`}
        onClick={handle(onToggleFavorite)}
        aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        title={favorited ? "Remove from favorites" : "Favorite"}
      >
        <FavoriteIcon filled={favorited} />
      </button>
      <button
        type="button"
        className={`sheet-card-action${pinned ? " is-active" : ""}`}
        onClick={handle(onTogglePin)}
        aria-label={pinned ? "Unpin" : "Pin"}
        title={pinned ? "Unpin" : "Pin"}
      >
        <PinIcon filled={pinned} />
      </button>
    </div>
  );
}

export function BuildingCard({ building, isWatched, onPress, priceDropCount, favorited, pinned, onToggleFavorite, onTogglePin }) {
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
  const newListingCount = building?.changeSummary?.newListingCount || 0;

  function handleKey(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPress();
    }
  }

  return (
    <div
      className={`sheet-card la-card la-card-building${pinned ? " is-pinned" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onPress}
      onKeyDown={handleKey}
    >
      <CardHoverActions
        favorited={favorited}
        pinned={pinned}
        onToggleFavorite={onToggleFavorite}
        onTogglePin={onTogglePin}
      />
      <div
        className="sheet-card-preview la-card-preview"
        style={{ background: buildingThumbColor(building.locationId || building.buildingName) }}
        aria-hidden
      >
        <BuildingIcon size={48} />
      </div>
      <div className="sheet-card-body">
        <div className="sheet-card-title">
          {building.buildingName}
          {newListingCount > 0 ? (
            <span className="la-new-pill" title={`${newListingCount} new since last check`}>
              {newListingCount} new
            </span>
          ) : null}
        </div>
        <div className="sheet-card-meta">
          <span>{countLine}</span>
        </div>
        <div className="la-card-footer">
          <span className="la-card-price">{priceLine}</span>
          {priceDropCount > 0 ? (
            <span className="la-drop-indicator">
              <ArrowIcon direction="down" size={10} />
              {priceDropCount}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ListingCard({ listing, hideBuildingName, onPress, onOpenExternal, favorited, pinned, onToggleFavorite, onTogglePin }) {
  const isTracked = Boolean(listing.isTracked);
  const isRemoved = listing.currentStatus === "removed";
  const currentPrice = isRemoved ? listing.lastKnownPrice : listing.price ?? listing.currentPrice ?? listing.lastKnownPrice;

  function handleKey(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPress();
    }
  }

  return (
    <div
      className={`sheet-card la-card la-card-listing${pinned ? " is-pinned" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onPress}
      onKeyDown={handleKey}
    >
      <CardHoverActions
        favorited={favorited}
        pinned={pinned}
        onToggleFavorite={onToggleFavorite}
        onTogglePin={onTogglePin}
      />
      <div className="sheet-card-preview la-card-listing-preview" aria-hidden>
        {listing.coverPhoto ? (
          <img src={listing.coverPhoto} alt="" className="la-card-listing-img" />
        ) : (
          <div className="la-card-listing-img la-card-listing-img-placeholder" />
        )}
      </div>
      <div className="sheet-card-body">
        <div className="sheet-card-title">{listing.title || "Untitled listing"}</div>
        {!hideBuildingName ? (
          <div className="sheet-card-meta">
            <span title={listing.buildingName}>{listing.buildingName}</span>
          </div>
        ) : null}
        <div className="la-card-specs">
          <span>{formatBedsAndBaths(listing.beds, listing.baths)}</span>
          <span className="la-cell-area">{formatArea(listing.areaSqft)}</span>
        </div>
        <div className="la-card-footer">
          <span className="la-card-price">
            {isRemoved ? formatPrice(listing.lastKnownPrice) : formatPriceRange(currentPrice, currentPrice)}
          </span>
          <div className="la-card-pills">
            {isTracked && listing.currentStatus ? <StatusPill listing={listing} /> : null}
            {isTracked ? <TrackingPill /> : null}
          </div>
        </div>
        <button
          type="button"
          className="btn-sm la-row-external-btn la-card-bayut"
          onClick={(event) => {
            event.stopPropagation();
            onOpenExternal();
          }}
        >
          Bayut
          <ExternalLinkIcon size={12} />
        </button>
      </div>
    </div>
  );
}

export function ListingHistoryRow({ listing, hideBuildingName, onPress, onOpenExternal, favorited, pinned, onToggleFavorite, onTogglePin }) {
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

  function handleKey(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPress();
    }
  }

  return (
    <div
      className={`sheet-row la-row la-row-listing${pinned ? " is-pinned" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onPress}
      onKeyDown={handleKey}
    >
      <span className="la-row-thumb-wrap" aria-hidden>
        {listing.coverPhoto ? (
          <img className="la-row-thumb" src={listing.coverPhoto} alt="" />
        ) : (
          <div className="la-row-thumb la-row-thumb-placeholder" />
        )}
      </span>
      <div className="la-row-primary">
        <span className="la-row-title">{listing.title || "Untitled listing"}</span>
        {statusLine ? <span className="la-row-sub">{statusLine}</span> : null}
      </div>
      {!hideBuildingName ? (
        <div className="la-row-building-name" title={listing.buildingName}>
          {listing.buildingName}
        </div>
      ) : null}
      <div className="la-row-details">
        <span>{formatBedsAndBaths(listing.beds, listing.baths)}</span>
        <span className="la-cell-area">{formatArea(listing.areaSqft)}</span>
      </div>
      <div className="la-row-price">
        <span className="la-cell-price-value">
          {isRemoved ? formatPrice(listing.lastKnownPrice) : formatPriceRange(currentPrice, currentPrice)}
        </span>
        {isTracked && !isRemoved ? <PriceDeltaChip priceDelta={listing.priceDelta} /> : null}
        {isTracked && Number.isFinite(listing.previousPrice) && listing.previousPrice !== currentPrice && !isRemoved ? (
          <span className="la-cell-was">Was {formatPrice(listing.previousPrice)}</span>
        ) : null}
      </div>
      <div className="la-row-status">
        {isTracked && listing.currentStatus ? <StatusPill listing={listing} /> : null}
        {isTracked ? <TrackingPill /> : null}
      </div>
      <div className="la-row-action" onClick={(event) => event.stopPropagation()}>
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
      </div>
      <RowHoverActions
        favorited={favorited}
        pinned={pinned}
        onToggleFavorite={onToggleFavorite}
        onTogglePin={onTogglePin}
      />
    </div>
  );
}
