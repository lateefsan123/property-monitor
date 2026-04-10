import { useMemo, useState } from "react";
import {
  formatArea,
  formatBedsAndBaths,
  formatListingTimestamp,
  formatPrice,
  formatPriceRange,
  formatSyncTimestamp,
} from "../formatters";
import { useListingAlerts } from "../useListingAlerts";
import ListingDetailPage from "./ListingDetailPage";

const VIEW_TAB_OPTIONS = [
  { id: "buildings", label: "Buildings" },
  { id: "listings", label: "Listings" },
];

const PRICE_BUCKETS = [
  { id: "all", label: "All" },
  { id: "lt1", label: "< 1M", max: 1_000_000 },
  { id: "1-3", label: "1-3M", min: 1_000_000, max: 3_000_000 },
  { id: "3-6", label: "3-6M", min: 3_000_000, max: 6_000_000 },
  { id: "gt6", label: "6M+", min: 6_000_000 },
];

const BED_OPTIONS = [
  { id: "all", label: "All" },
  { id: "studio", label: "Studio", match: (b) => b === 0 },
  { id: "1", label: "1 bed", match: (b) => b === 1 },
  { id: "2", label: "2 bed", match: (b) => b === 2 },
  { id: "3plus", label: "3+ bed", match: (b) => Number.isFinite(b) && b >= 3 },
];

const TRACK_STATUS_OPTIONS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "removed", label: "Off market" },
];

// ---------- Icons ----------

function HomeIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

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

// ---------- Inline pieces ----------

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

function WatchButton({ active, onClick }) {
  return (
    <button
      type="button"
      className={`btn-sm la-watch-btn${active ? " active" : ""}`}
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

// ---------- Rows ----------

function BuildingRow({ building, isWatched, onToggleWatch, onPress, changeCount }) {
  const hasListingCount = Number.isFinite(building.listingCount);
  const countLine = hasListingCount
    ? `${building.listingCount} ${building.listingCount === 1 ? "listing" : "listings"}`
    : building.fullPath || "Bayut location";
  const priceLine = building.fetchError
    ? "Live pricing unavailable"
    : hasListingCount && building.listingCount === 0
      ? "No live listings"
      : building.lowestPrice != null || building.highestPrice != null
        ? formatPriceRange(building.lowestPrice, building.highestPrice)
        : "Watch to load listings";

  return (
    <div
      className="la-row la-row-pressable"
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
      {building.imageUrl ? (
        <img className="la-row-thumb" src={building.imageUrl} alt="" />
      ) : (
        <div className="la-row-thumb la-row-thumb-placeholder" />
      )}

      <div className="la-row-body">
        <div className="la-row-title">{building.buildingName}</div>
        <div className="la-row-sub">
          <HomeIcon size={13} />
          <span>{countLine}</span>
        </div>
        <div className="la-row-price">{priceLine}</div>
        {changeCount > 0 ? (
          <div className="la-row-badges">
            <span className="la-update-badge">
              {changeCount} {changeCount === 1 ? "update" : "updates"}
            </span>
          </div>
        ) : null}
      </div>

      <WatchButton active={isWatched} onClick={onToggleWatch} />
    </div>
  );
}

function ListingHistoryRow({ listing, onPress, onOpenExternal }) {
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
    <div
      className="la-row la-row-pressable"
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
      {listing.coverPhoto ? (
        <img className="la-row-thumb" src={listing.coverPhoto} alt="" />
      ) : (
        <div className="la-row-thumb la-row-thumb-placeholder" />
      )}

      <div className="la-row-body">
        <div className="la-row-title">{listing.title || "Untitled listing"}</div>
        <div className="la-row-sub">
          <HomeIcon size={13} />
          <span>{listing.buildingName}</span>
        </div>
        <div className="la-row-price-row">
          <span className="la-row-price">
            {isRemoved ? `Last seen ${formatPrice(listing.lastKnownPrice)}` : formatPriceRange(currentPrice, currentPrice)}
          </span>
          {isTracked && !isRemoved ? <PriceDeltaChip priceDelta={listing.priceDelta} /> : null}
          {isTracked ? <TrackingPill /> : null}
          {isTracked && listing.currentStatus ? <StatusPill listing={listing} /> : null}
        </div>
        {isTracked && Number.isFinite(listing.previousPrice) && listing.previousPrice !== currentPrice && !isRemoved ? (
          <div className="la-row-was">Was {formatPrice(listing.previousPrice)}</div>
        ) : null}
        {statusLine ? <div className="la-row-status-line">{statusLine}</div> : null}
        <div className="la-row-meta">
          {formatBedsAndBaths(listing.beds, listing.baths)} | {formatArea(listing.areaSqft)} | {formatListingTimestamp(listing.lastVerifiedAt || listing.verifiedAt || listing.lastSeenAt)}
        </div>
      </div>

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
  );
}

// ---------- Inline filter toolbar ----------

function FilterTabs({ options, value, onChange }) {
  return (
    <div className="tabs">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`tab${value === option.id ? " active" : ""}`}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ListingAlertsFilters({
  viewTab,
  watchingOnly,
  setWatchingOnly,
  trackedOnly,
  setTrackedOnly,
  priceChangedOnly,
  setPriceChangedOnly,
  trackedStatusFilter,
  setTrackedStatusFilter,
  priceFilter,
  setPriceFilter,
  bedsFilter,
  setBedsFilter,
  hasTrackedUnits,
}) {
  return (
    <div className="toolbar la-filters">
      <div className="toolbar-actions">
        <label className="toggle">
          <input
            type="checkbox"
            checked={watchingOnly}
            onChange={(event) => setWatchingOnly(event.target.checked)}
          />
          Watching only
        </label>

        {viewTab === "listings" ? (
          <>
            <label className="toggle">
              <input
                type="checkbox"
                checked={trackedOnly}
                onChange={(event) => setTrackedOnly(event.target.checked)}
              />
              Tracked units only
            </label>

            <label className="toggle">
              <input
                type="checkbox"
                checked={priceChangedOnly}
                onChange={(event) => setPriceChangedOnly(event.target.checked)}
              />
              Price moves only
            </label>
          </>
        ) : null}
      </div>

      {viewTab === "listings" ? (
        <div className="toolbar-actions la-filter-groups">
          {hasTrackedUnits ? (
            <div className="la-filter-group">
              <span className="la-filter-group-label">Status</span>
              <FilterTabs
                options={TRACK_STATUS_OPTIONS}
                value={trackedStatusFilter}
                onChange={setTrackedStatusFilter}
              />
            </div>
          ) : null}

          <div className="la-filter-group">
            <span className="la-filter-group-label">Price</span>
            <FilterTabs options={PRICE_BUCKETS} value={priceFilter} onChange={setPriceFilter} />
          </div>

          <div className="la-filter-group">
            <span className="la-filter-group-label">Beds</span>
            <FilterTabs options={BED_OPTIONS} value={bedsFilter} onChange={setBedsFilter} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------- Page ----------

export default function ListingAlertsPage() {
  const alerts = useListingAlerts();

  const [viewTab, setViewTab] = useState("buildings");
  const [watchingOnly, setWatchingOnly] = useState(false);
  const [trackedOnly, setTrackedOnly] = useState(false);
  const [priceChangedOnly, setPriceChangedOnly] = useState(false);
  const [priceFilter, setPriceFilter] = useState("all");
  const [bedsFilter, setBedsFilter] = useState("all");
  const [trackedStatusFilter, setTrackedStatusFilter] = useState("all");
  // When the user drills into a building from the Buildings tab, we scope the Listings tab
  // to that building. Cleared when the user manually switches back to Buildings or hits Clear.
  const [buildingScope, setBuildingScope] = useState(null);
  // We store only the lookup key (locationId + id) and derive the live listing object from
  // the current alerts data — that way the detail view automatically reflects fresh prices,
  // tracking state changes, and history updates without a setState-in-effect ping-pong.
  const [selectedListingKey, setSelectedListingKey] = useState(null);
  const hasTrackedUnits = alerts.stats.trackedListingCount > 0;

  const selectedListing = useMemo(() => {
    if (!selectedListingKey) return null;
    return [...(alerts.latestListings || []), ...(alerts.trackedListings || [])].find(
      (item) => item.key === selectedListingKey
        || `${item.locationId}:${item.id}` === selectedListingKey,
    ) || null;
  }, [alerts.latestListings, alerts.trackedListings, selectedListingKey]);

  function openListing(url) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openListingDetails(listing) {
    if (!listing) return;
    setSelectedListingKey(listing.key || `${listing.locationId}:${listing.id}`);
  }

  function toggleListingTracking(listing) {
    if (!listing) return;
    alerts.actions.toggleListingSelection(listing);
  }

  function openBuildingListings(building) {
    if (!building) return;
    setBuildingScope({
      locationId: building.locationId,
      name: building.buildingName,
    });
    setViewTab("listings");
  }

  function clearBuildingScope() {
    setBuildingScope(null);
  }

  function handleViewTabChange(nextTab) {
    if (nextTab === "buildings") {
      setBuildingScope(null);
    }
    setViewTab(nextTab);
  }

  const changeCountByBuilding = useMemo(() => {
    const map = new Map();
    for (const item of alerts.changeItems || []) {
      const key = item.buildingKey || item.locationId;
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [alerts.changeItems]);

  const buildings = useMemo(() => {
    const source = watchingOnly
      ? alerts.watchedBuildings
      : alerts.usingLiveSearch
        ? alerts.searchResults
        : alerts.popularBuildings;
    return source || [];
  }, [alerts.popularBuildings, alerts.searchResults, alerts.usingLiveSearch, alerts.watchedBuildings, watchingOnly]);

  const listings = useMemo(() => {
    let source = [];

    if (!alerts.stats.watchedBuildingCount) {
      source = alerts.latestListings || [];
    } else if (trackedOnly || trackedStatusFilter !== "all") {
      source = alerts.trackedListings || [];
    } else {
      source = alerts.latestListings || [];
    }

    if (buildingScope?.locationId) {
      source = source.filter((l) => l.locationId === buildingScope.locationId);
    }

    if (watchingOnly && alerts.watchedSet?.size) {
      source = source.filter((l) => alerts.watchedSet.has(l.locationId));
    }

    if (trackedOnly) {
      source = source.filter((l) => l.isTracked || l.currentStatus);
    }

    if (trackedStatusFilter !== "all") {
      source = source.filter((l) => {
        if (!l.isTracked && !l.currentStatus) return false;
        if (trackedStatusFilter === "removed") return l.currentStatus === "removed";
        return (l.currentStatus || "active") === "active";
      });
    }

    if (priceChangedOnly) {
      source = source.filter((l) =>
        l.isTracked || l.currentStatus
          ? (l.dropsCount || 0) > 0 || (l.increasesCount || 0) > 0 || (Number.isFinite(l.priceDelta) && l.priceDelta !== 0)
          : Number.isFinite(l.priceDelta) && l.priceDelta !== 0,
      );
    }

    const bucket = PRICE_BUCKETS.find((b) => b.id === priceFilter);
    if (bucket && bucket.id !== "all") {
      source = source.filter((l) => {
        const price = l.currentStatus === "removed"
          ? l.lastKnownPrice
          : l.currentPrice ?? l.price ?? l.lastKnownPrice;
        if (!Number.isFinite(price)) return false;
        if (bucket.min != null && price < bucket.min) return false;
        if (bucket.max != null && price >= bucket.max) return false;
        return true;
      });
    }

    const bed = BED_OPTIONS.find((b) => b.id === bedsFilter);
    if (bed && bed.match) {
      source = source.filter((l) => bed.match(l.beds));
    }

    return source;
  }, [
    alerts.latestListings,
    alerts.stats.watchedBuildingCount,
    alerts.trackedListings,
    alerts.watchedSet,
    bedsFilter,
    buildingScope,
    priceChangedOnly,
    priceFilter,
    trackedOnly,
    trackedStatusFilter,
    watchingOnly,
  ]);

  const count = viewTab === "buildings" ? buildings.length : listings.length;
  const countLabel = viewTab === "buildings"
    ? `${count} ${count === 1 ? "building" : "buildings"}`
    : `${count} ${count === 1 ? "listing" : "listings"}`;
  const listingHeaderText = !alerts.stats.watchedBuildingCount
    ? "Watch a building to browse its live units"
    : !hasTrackedUnits
      ? `Pick the exact units you care about, last checked ${formatSyncTimestamp(alerts.alertSummary.lastCheckedAt)}`
      : `${alerts.stats.trackedListingCount} tracked ${alerts.stats.trackedListingCount === 1 ? "unit" : "units"}, ${alerts.alertSummary.totalChanges} changes, last checked ${formatSyncTimestamp(alerts.alertSummary.lastCheckedAt)}`;

  if (!alerts.hydrated) {
    return (
      <div className="la-page">
        <div className="la-loading">Loading listing alerts...</div>
      </div>
    );
  }

  if (selectedListing) {
    return (
      <ListingDetailPage
        listing={selectedListing}
        onBack={() => setSelectedListingKey(null)}
        onOpenExternal={() => openListing(selectedListing.bayutUrl)}
        onToggleTracking={() => toggleListingTracking(selectedListing)}
      />
    );
  }

  const items = viewTab === "buildings" ? buildings : listings;
  const showEmpty = items.length === 0;

  const showRefresh = viewTab === "listings" && alerts.stats.watchedBuildingCount > 0;
  const showListingSubtitle = viewTab === "listings" && alerts.stats.watchedBuildingCount > 0;

  return (
    <div className="la-page">
      <div className="la-page-header">
        <div className="la-page-header-titles">
          <h1 className="la-page-title">Listing Alerts</h1>
          {showListingSubtitle ? (
            <p className="la-page-subtitle">{listingHeaderText}</p>
          ) : null}
        </div>
        {showRefresh ? (
          <button
            type="button"
            className="btn-sm"
            onClick={alerts.actions.refresh}
            disabled={alerts.watchedLoading}
          >
            {alerts.watchedLoading ? "Refreshing..." : "Refresh"}
          </button>
        ) : null}
      </div>

      <div className="view-tabs la-view-tabs">
        {VIEW_TAB_OPTIONS.map((tab) => {
          const isActive = viewTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`view-tab${isActive ? " active" : ""}`}
              onClick={() => handleViewTabChange(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {viewTab === "listings" && buildingScope ? (
        <div className="la-scope-banner">
          <span className="la-scope-banner-label">Showing units in</span>
          <span className="la-scope-banner-name">{buildingScope.name}</span>
          <button type="button" className="btn-sm la-scope-banner-clear" onClick={clearBuildingScope}>
            Clear
          </button>
        </div>
      ) : null}

      {viewTab === "buildings" ? (
        <div className="toolbar la-search">
          <input
            type="text"
            placeholder="Search buildings on Bayut..."
            value={alerts.searchTerm}
            onChange={(event) => alerts.actions.setSearchTerm(event.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
      ) : null}

      <ListingAlertsFilters
        viewTab={viewTab}
        watchingOnly={watchingOnly}
        setWatchingOnly={setWatchingOnly}
        trackedOnly={trackedOnly}
        setTrackedOnly={setTrackedOnly}
        priceChangedOnly={priceChangedOnly}
        setPriceChangedOnly={setPriceChangedOnly}
        trackedStatusFilter={trackedStatusFilter}
        setTrackedStatusFilter={setTrackedStatusFilter}
        priceFilter={priceFilter}
        setPriceFilter={setPriceFilter}
        bedsFilter={bedsFilter}
        setBedsFilter={setBedsFilter}
        hasTrackedUnits={hasTrackedUnits}
      />

      {alerts.searchError && viewTab === "buildings" ? (
        <div className="la-error-box">{alerts.searchError}</div>
      ) : null}
      {alerts.watchError && watchingOnly ? (
        <div className="la-error-box">{alerts.watchError}</div>
      ) : null}

      <p className="count-text">{countLabel}</p>

      <div className="la-list">
        {showEmpty ? (
          viewTab === "buildings" && alerts.searchLoading ? (
            <div className="la-empty">
              <div className="la-empty-text">Searching Bayut buildings...</div>
            </div>
          ) : (
            <div className="la-empty">
              <div className="la-empty-title">
                {viewTab === "buildings" ? "No buildings match" : "No listings match"}
              </div>
              <div className="la-empty-text">
                {viewTab === "buildings"
                  ? "Try a broader search term, or switch off the Watching filter."
                  : buildingScope
                    ? "No live units for this building yet. Try clearing other filters, or watch the building so we can pull its listings."
                    : alerts.stats.watchedBuildingCount
                      ? hasTrackedUnits
                        ? "Try another filter, or switch off Tracked only to browse more live units."
                        : "Open a live unit and track the exact ones you want alerts for."
                      : "Watch a few buildings first and this tab will start showing their live units."}
              </div>
            </div>
          )
        ) : (
          items.map((item, index) => {
            if (viewTab === "buildings") {
              const changeCount = changeCountByBuilding.get(item.locationId)
                || changeCountByBuilding.get(item.key)
                || 0;
              return (
                <div key={String(item.locationId || item.key || index)} className="la-list-item">
                  <BuildingRow
                    building={item}
                    isWatched={alerts.watchedSet?.has(item.locationId)}
                    onToggleWatch={() => alerts.actions.toggleWatch(item)}
                    onPress={() => openBuildingListings(item)}
                    changeCount={changeCount}
                  />
                </div>
              );
            }
            return (
              <div key={String(item.key || `${item.buildingKey || ""}-${item.id || index}`)} className="la-list-item">
                <ListingHistoryRow
                  listing={item}
                  onPress={() => openListingDetails(item)}
                  onOpenExternal={() => openListing(item.bayutUrl)}
                />
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
