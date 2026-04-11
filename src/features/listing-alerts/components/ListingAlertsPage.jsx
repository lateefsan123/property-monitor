import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatArea,
  formatBedsAndBaths,
  formatListingTimestamp,
  formatPrice,
  formatPriceRange,
  formatSyncTimestamp,
} from "../formatters";
import Pagination from "../../seller-signal/components/Pagination";
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

const TRACK_STATUS_OPTIONS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "removed", label: "Off market" },
];

const LISTINGS_PAGE_SIZE = 25;
const EMPTY_OPTIONS = [];

// ---------- Icons ----------

function HomeIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

function SearchIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function LocationPinIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2.5" />
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

function getSearchOptionLabel(option) {
  return option?.buildingName || option?.searchName || "Unknown";
}

function getSearchOptionMeta(option) {
  const fullPath = String(option?.fullPath || "").trim();
  if (!fullPath) return null;

  const label = getSearchOptionLabel(option).toLowerCase();
  const parts = fullPath.split("|").map((part) => part.trim()).filter(Boolean);
  const remaining = parts.filter((part, index) => index !== 0 || part.toLowerCase() !== label);

  return (remaining.length ? remaining : parts).join(", ");
}

// ---------- Rows ----------

function BuildingRow({ building, isWatched, watchDisabled, onToggleWatch, onPress, changeCount }) {
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

      <WatchButton active={isWatched} disabled={watchDisabled} onClick={onToggleWatch} />
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
  showTrackedToggle,
  priceChangedOnly,
  setPriceChangedOnly,
  trackedStatusFilter,
  setTrackedStatusFilter,
  priceFilter,
  setPriceFilter,
  buildingFilterOptions,
  listingBuildingFilter,
  setListingBuildingFilter,
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

        {viewTab === "listings" && showTrackedToggle ? (
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
          {buildingFilterOptions.length ? (
            <div className="la-filter-group">
              <span className="la-filter-group-label">Building</span>
              <select
                className="la-filter-select"
                value={listingBuildingFilter}
                onChange={(event) => setListingBuildingFilter(event.target.value)}
              >
                <option value="all">All watched buildings</option>
                {buildingFilterOptions.map((building) => (
                  <option key={building.locationId} value={building.locationId}>
                    {building.buildingName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

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
  const [trackedStatusFilter, setTrackedStatusFilter] = useState("all");
  const [listingBuildingFilter, setListingBuildingFilter] = useState("all");
  const [listingsPage, setListingsPage] = useState(1);
  const [selectedSearchOption, setSelectedSearchOption] = useState(null);
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const [searchActiveIndex, setSearchActiveIndex] = useState(0);
  const searchBoxRef = useRef(null);
  // We store only the lookup key (locationId + id) and derive the live listing object from
  // the current alerts data — that way the detail view automatically reflects fresh prices,
  // tracking state changes, and history updates without a setState-in-effect ping-pong.
  const [selectedListingKey, setSelectedListingKey] = useState(null);
  const hasTrackedUnits = alerts.stats.trackedListingCount > 0;
  const buildingFilterOptions = alerts.watchedBuildings ?? EMPTY_OPTIONS;
  const autoTracking = alerts.autoTracking;
  const searchOptions = alerts.searchResults ?? EMPTY_OPTIONS;
  const effectiveTrackedOnly = autoTracking ? false : trackedOnly;
  const effectiveListingBuildingFilter = useMemo(() => {
    if (listingBuildingFilter === "all") return "all";
    return buildingFilterOptions.some((building) => building.locationId === listingBuildingFilter)
      ? listingBuildingFilter
      : "all";
  }, [buildingFilterOptions, listingBuildingFilter]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!searchBoxRef.current?.contains(event.target)) {
        setSearchMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

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
    if (!alerts.watchedSet?.has(building.locationId)) {
      const didWatch = alerts.actions.toggleWatch(building);
      if (!didWatch) return;
    }
    setListingBuildingFilter(building.locationId || "all");
    setListingsPage(1);
    setViewTab("listings");
  }

  function handleViewTabChange(nextTab) {
    setListingsPage(1);
    setViewTab(nextTab);
  }

  function handleWatchingOnlyChange(nextValue) {
    setListingsPage(1);
    setWatchingOnly(nextValue);
  }

  function handleTrackedOnlyChange(nextValue) {
    setListingsPage(1);
    setTrackedOnly(nextValue);
  }

  function handlePriceChangedOnlyChange(nextValue) {
    setListingsPage(1);
    setPriceChangedOnly(nextValue);
  }

  function handleTrackedStatusFilterChange(nextValue) {
    setListingsPage(1);
    setTrackedStatusFilter(nextValue);
  }

  function handlePriceFilterChange(nextValue) {
    setListingsPage(1);
    setPriceFilter(nextValue);
  }

  function handleListingBuildingFilterChange(nextValue) {
    setListingsPage(1);
    setListingBuildingFilter(nextValue);
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

  const selectedSearchBuilding = useMemo(() => {
    if (!selectedSearchOption?.locationId) return null;
    return (alerts.watchedBuildings || []).find((building) => building.locationId === selectedSearchOption.locationId)
      || searchOptions.find((building) => building.locationId === selectedSearchOption.locationId)
      || selectedSearchOption;
  }, [alerts.watchedBuildings, searchOptions, selectedSearchOption]);

  const buildings = useMemo(() => {
    if (watchingOnly) {
      if (selectedSearchBuilding?.locationId) {
        return (alerts.watchedBuildings || []).filter((building) => building.locationId === selectedSearchBuilding.locationId);
      }
      return alerts.watchedBuildings || [];
    }
    if (selectedSearchBuilding) return [selectedSearchBuilding];
    if (alerts.usingLiveSearch) return searchOptions;
    return alerts.watchedBuildings || [];
  }, [alerts.usingLiveSearch, alerts.watchedBuildings, searchOptions, selectedSearchBuilding, watchingOnly]);

  const listings = useMemo(() => {
    let source = [];

    if (!alerts.stats.watchedBuildingCount) {
      source = [];
    } else if (effectiveTrackedOnly || trackedStatusFilter !== "all") {
      source = alerts.trackedListings || [];
    } else {
      source = alerts.latestListings || [];
    }

    if (effectiveListingBuildingFilter !== "all") {
      source = source.filter((l) => l.locationId === effectiveListingBuildingFilter);
    }

    if (watchingOnly && alerts.watchedSet?.size) {
      source = source.filter((l) => alerts.watchedSet.has(l.locationId));
    }

    if (effectiveTrackedOnly) {
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

    return source;
  }, [
    alerts.latestListings,
    alerts.stats.watchedBuildingCount,
    alerts.trackedListings,
    alerts.watchedSet,
    effectiveListingBuildingFilter,
    effectiveTrackedOnly,
    priceChangedOnly,
    priceFilter,
    trackedStatusFilter,
    watchingOnly,
  ]);

  const count = viewTab === "buildings" ? buildings.length : listings.length;
  const countLabel = viewTab === "buildings"
    ? `${count} ${count === 1 ? "building" : "buildings"}`
    : `${count} ${count === 1 ? "listing" : "listings"}`;
  const selectedBuildingOption = useMemo(
    () => buildingFilterOptions.find((building) => building.locationId === effectiveListingBuildingFilter) || null,
    [buildingFilterOptions, effectiveListingBuildingFilter],
  );
  const totalLiveListings = useMemo(() => {
    if (!alerts.stats.watchedBuildingCount) return 0;
    if (effectiveListingBuildingFilter !== "all") {
      if (selectedBuildingOption?.listings?.length) return selectedBuildingOption.listings.length;
      if (Number.isFinite(selectedBuildingOption?.listingCount)) return selectedBuildingOption.listingCount;
      return 0;
    }

    return buildingFilterOptions.reduce((sum, building) => {
      if (building?.listings?.length) return sum + building.listings.length;
      if (Number.isFinite(building?.listingCount)) return sum + building.listingCount;
      return sum;
    }, 0);
  }, [alerts.stats.watchedBuildingCount, buildingFilterOptions, effectiveListingBuildingFilter, selectedBuildingOption]);
  const totalLiveListingsLabel = effectiveListingBuildingFilter !== "all"
    ? selectedBuildingOption?.buildingName || "selected building"
    : "watched buildings";
  const listingTotalPages = Math.max(1, Math.ceil(listings.length / LISTINGS_PAGE_SIZE));
  const listingSafePage = Math.min(listingsPage, listingTotalPages);
  const listingVisibleStart = count ? ((listingSafePage - 1) * LISTINGS_PAGE_SIZE) + 1 : 0;
  const listingVisibleEnd = Math.min(listingSafePage * LISTINGS_PAGE_SIZE, count);
  const pagedListings = useMemo(() => {
    const startIndex = (listingSafePage - 1) * LISTINGS_PAGE_SIZE;
    return listings.slice(startIndex, startIndex + LISTINGS_PAGE_SIZE);
  }, [listingSafePage, listings]);
  const listingHeaderText = !alerts.stats.watchedBuildingCount
    ? "Watch a building to browse its apartments"
    : !hasTrackedUnits
      ? `Pick the exact units you care about, last checked ${formatSyncTimestamp(alerts.alertSummary.lastCheckedAt)}`
      : `${alerts.stats.trackedListingCount} tracked ${alerts.stats.trackedListingCount === 1 ? "unit" : "units"}, ${alerts.alertSummary.totalChanges} changes, last checked ${formatSyncTimestamp(alerts.alertSummary.lastCheckedAt)}`;

  if (!alerts.hydrated) {
    return (
      <div className="la-page">
        <div className="la-list" aria-busy="true" aria-label="Loading listing alerts">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="la-list-item" key={index}>
              <div className="skeleton-card">
                <div className="skeleton-card-row">
                  <div className="skeleton-avatar" />
                  <div className="skeleton-stack">
                    <div className="skeleton-bar tall medium" />
                    <div className="skeleton-bar short" />
                  </div>
                  <div className="skeleton-bar pill" />
                </div>
              </div>
            </div>
          ))}
        </div>
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
        autoTracking={autoTracking}
      />
    );
  }

  const items = viewTab === "buildings" ? buildings : pagedListings;
  const isListLoading =
    (viewTab === "buildings" && alerts.searchLoading)
    || (viewTab === "listings" && alerts.watchedLoading);
  const showSkeletonList = isListLoading && items.length === 0;
  const showEmpty = items.length === 0 && !showSkeletonList;
  const showRefreshingStrip = isListLoading && items.length > 0;

  const showRefresh = viewTab === "listings" && alerts.stats.watchedBuildingCount > 0;
  const showListingSubtitle = viewTab === "listings" && alerts.stats.watchedBuildingCount > 0;
  const safeSearchActiveIndex = searchOptions.length
    ? Math.min(searchActiveIndex, searchOptions.length - 1)
    : 0;
  const showSearchDropdown = viewTab === "buildings"
    && searchMenuOpen
    && alerts.searchTerm.trim().length >= 2
    && (alerts.searchLoading || Boolean(alerts.searchError) || searchOptions.length > 0 || !selectedSearchOption);

  function handleSearchInputChange(event) {
    const nextValue = event.target.value;
    setSelectedSearchOption(null);
    setSearchMenuOpen(nextValue.trim().length >= 2);
    setSearchActiveIndex(0);
    alerts.actions.setSearchTerm(nextValue);
  }

  function handleSearchOptionSelect(option) {
    if (!option) return;
    setSelectedSearchOption(option);
    setSearchMenuOpen(false);
    setSearchActiveIndex(0);
    alerts.actions.setSearchTerm(getSearchOptionLabel(option));
  }

  function clearSearchSelection() {
    setSelectedSearchOption(null);
    setSearchMenuOpen(false);
    setSearchActiveIndex(0);
    alerts.actions.setSearchTerm("");
  }

  function handleSearchKeyDown(event) {
    if (event.key === "Escape") {
      setSearchMenuOpen(false);
      return;
    }

    if (alerts.searchTerm.trim().length < 2) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!searchMenuOpen) {
        setSearchMenuOpen(true);
        setSearchActiveIndex(0);
        return;
      }
      setSearchMenuOpen(true);
      if (!searchOptions.length) return;
      setSearchActiveIndex((current) => (current + 1) % searchOptions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!searchMenuOpen) {
        setSearchMenuOpen(true);
        setSearchActiveIndex(Math.max(searchOptions.length - 1, 0));
        return;
      }
      setSearchMenuOpen(true);
      if (!searchOptions.length) return;
      setSearchActiveIndex((current) => (current - 1 + searchOptions.length) % searchOptions.length);
      return;
    }

    if (event.key === "Enter" && searchMenuOpen && searchOptions.length) {
      event.preventDefault();
      handleSearchOptionSelect(searchOptions[safeSearchActiveIndex] || searchOptions[0]);
    }
  }

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

      {viewTab === "buildings" ? (
        <div className="toolbar la-search">
          <div className="la-search-box" ref={searchBoxRef}>
            <div className="la-search-input-wrap">
              <span className="la-search-icon" aria-hidden="true">
                <SearchIcon size={16} />
              </span>
              <input
                type="text"
                placeholder="Search buildings on Bayut..."
                value={alerts.searchTerm}
                onChange={handleSearchInputChange}
                onFocus={() => {
                  if (alerts.searchTerm.trim().length >= 2) {
                    setSearchMenuOpen(true);
                  }
                }}
                onKeyDown={handleSearchKeyDown}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={showSearchDropdown}
                aria-label="Search buildings"
              />
              {alerts.searchTerm ? (
                <button
                  type="button"
                  className="la-search-clear"
                  onClick={clearSearchSelection}
                >
                  Clear
                </button>
              ) : null}
            </div>

            {showSearchDropdown ? (
              <div className="la-search-dropdown" role="listbox" aria-label="Available building options">
                {alerts.searchLoading ? (
                  <div className="la-search-dropdown-state">Searching available buildings...</div>
                ) : alerts.searchError ? (
                  <div className="la-search-dropdown-state">Search is unavailable right now.</div>
                ) : searchOptions.length ? (
                  searchOptions.map((option, index) => {
                    const meta = getSearchOptionMeta(option);
                    const isActive = index === safeSearchActiveIndex;
                    const isSelected = selectedSearchBuilding?.locationId === option.locationId;
                    return (
                      <button
                        key={option.locationId}
                        type="button"
                        className={`la-search-option${isActive ? " active" : ""}${isSelected ? " selected" : ""}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSearchOptionSelect(option)}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span className="la-search-option-icon" aria-hidden="true">
                          <LocationPinIcon size={15} />
                        </span>
                        <span className="la-search-option-copy">
                          <span className="la-search-option-title">
                            <span className="la-search-option-name">{getSearchOptionLabel(option)}</span>
                            {meta ? <span className="la-search-option-meta">, {meta}</span> : null}
                          </span>
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="la-search-dropdown-state">No available buildings match that search.</div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <ListingAlertsFilters
        viewTab={viewTab}
        watchingOnly={watchingOnly}
        setWatchingOnly={handleWatchingOnlyChange}
        trackedOnly={effectiveTrackedOnly}
        setTrackedOnly={handleTrackedOnlyChange}
        showTrackedToggle={!autoTracking}
        priceChangedOnly={priceChangedOnly}
        setPriceChangedOnly={handlePriceChangedOnlyChange}
        trackedStatusFilter={trackedStatusFilter}
        setTrackedStatusFilter={handleTrackedStatusFilterChange}
        priceFilter={priceFilter}
        setPriceFilter={handlePriceFilterChange}
        buildingFilterOptions={buildingFilterOptions}
        listingBuildingFilter={effectiveListingBuildingFilter}
        setListingBuildingFilter={handleListingBuildingFilterChange}
        hasTrackedUnits={hasTrackedUnits}
      />

      {alerts.searchError && viewTab === "buildings" ? (
        <div className="la-error-box">{alerts.searchError}</div>
      ) : null}
      {alerts.watchError ? (
        <div className="la-error-box">{alerts.watchError}</div>
      ) : null}
      {alerts.alertSummary?.newListingCount > 0 ? (
        <div className="la-notice-box">
          {alerts.alertSummary.newListingCount} new {alerts.alertSummary.newListingCount === 1 ? "listing" : "listings"} added since the last check.
        </div>
      ) : null}

      <div className="la-results-bar">
        <span className="la-results-count">
          {viewTab === "listings" && totalLiveListings > count
            ? `${countLabel} loaded`
            : countLabel}
        </span>
        {viewTab === "listings" ? (
          <span className="la-results-meta">
            {totalLiveListings > 0 ? `${totalLiveListings} total live in ${totalLiveListingsLabel} • ` : ""}
            {count ? `Showing ${listingVisibleStart}-${listingVisibleEnd}` : "Showing 0"}
            {` • Page ${listingSafePage}/${listingTotalPages}`}
          </span>
        ) : null}
      </div>

      {showRefreshingStrip ? (
        <div className="la-refreshing-strip" role="status" aria-live="polite">
          <span className="la-refreshing-dot" />
          {viewTab === "buildings" ? "Searching Bayut..." : "Refreshing listings..."}
        </div>
      ) : null}

      <div className="la-list" aria-busy={isListLoading || undefined}>
        {showSkeletonList ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div className="la-list-item" key={`skeleton-${index}`}>
              <div className="skeleton-card">
                <div className="skeleton-card-row">
                  <div className="skeleton-avatar" />
                  <div className="skeleton-stack">
                    <div className="skeleton-bar tall medium" />
                    <div className="skeleton-bar short" />
                  </div>
                  <div className="skeleton-bar pill" />
                </div>
              </div>
            </div>
          ))
        ) : showEmpty ? (
          <div className="la-empty">
            <div className="la-empty-title">
              {viewTab === "buildings" ? "No buildings match" : "No listings match"}
            </div>
            <div className="la-empty-text">
              {viewTab === "buildings"
                ? "Try a broader search term, or switch off the Watching filter."
                : alerts.stats.watchedBuildingCount
                    ? hasTrackedUnits
                      ? "Try another filter, or switch off Tracked only to browse more live units."
                      : "Open a live unit and track the exact ones you want alerts for."
                    : "Watch a building first, then this tab will show its live apartments."}
            </div>
          </div>
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
                    watchDisabled={!alerts.watchedSet?.has(item.locationId) && alerts.stats.watchedBuildingCount >= alerts.watchLimit}
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

      {viewTab === "listings" ? (
        <div className="la-pagination">
          <Pagination
            currentPage={listingSafePage}
            totalPages={listingTotalPages}
            onPrevious={() => setListingsPage((page) => Math.max(1, page - 1))}
            onNext={() => setListingsPage((page) => Math.min(listingTotalPages, page + 1))}
          />
        </div>
      ) : null}

    </div>
  );
}
