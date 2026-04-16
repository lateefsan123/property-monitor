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

const PRICE_SLIDER_MIN = 0;
const PRICE_SLIDER_MAX = 50_000_000;
const PRICE_SLIDER_STEP = 100_000;

const TRACK_STATUS_OPTIONS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "removed", label: "Off market" },
  { id: "price-drops", label: "Price drops" },
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

function BuildingRow({ building, isWatched, watchDisabled, onToggleWatch, onPress, priceDropCount }) {
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
      <td className="lead-cell-action" onClick={(e) => e.stopPropagation()}>
        <WatchButton active={isWatched} disabled={watchDisabled} onClick={onToggleWatch} />
      </td>
    </tr>
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
      <td className="lead-cell-action" onClick={(e) => e.stopPropagation()}>
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

function formatSliderPrice(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function PriceRangeSlider({ min, max, valueMin, valueMax, step, onMinChange, onMaxChange }) {
  const leftPercent = ((valueMin - min) / (max - min)) * 100;
  const rightPercent = ((valueMax - min) / (max - min)) * 100;

  return (
    <div className="la-price-slider">
      <span className="la-price-slider-label">{formatSliderPrice(valueMin)}</span>
      <div className="la-price-slider-track-wrap">
        <div className="la-price-slider-track">
          <div
            className="la-price-slider-fill"
            style={{ left: `${leftPercent}%`, right: `${100 - rightPercent}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMin}
          onChange={(e) => onMinChange(Number(e.target.value))}
          className="la-price-slider-input"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMax}
          onChange={(e) => onMaxChange(Number(e.target.value))}
          className="la-price-slider-input"
        />
      </div>
      <span className="la-price-slider-label">{formatSliderPrice(valueMax)}</span>
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
  priceMin,
  priceMax,
  priceRangeMin,
  priceRangeMax,
  onPriceMinChange,
  onPriceMaxChange,
  hasTrackedUnits,
}) {
  return (
    <div className="toolbar la-filters">
      <div className="toolbar-actions">
        {viewTab === "buildings" ? (
          <label className="toggle">
            <input
              type="checkbox"
              checked={watchingOnly}
              onChange={(event) => setWatchingOnly(event.target.checked)}
            />
            Watching only
          </label>
        ) : null}

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
          <FilterTabs
            options={TRACK_STATUS_OPTIONS}
            value={trackedStatusFilter}
            onChange={setTrackedStatusFilter}
          />

          <PriceRangeSlider
            min={priceRangeMin}
            max={priceRangeMax}
            step={PRICE_SLIDER_STEP}
            valueMin={priceMin}
            valueMax={priceMax}
            onMinChange={onPriceMinChange}
            onMaxChange={onPriceMaxChange}
          />
        </div>
      ) : null}
    </div>
  );
}

// ---------- Page ----------

export default function ListingAlertsPage() {
  const alerts = useListingAlerts();

  const [watchingOnly, setWatchingOnly] = useState(false);
  const [trackedOnly, setTrackedOnly] = useState(false);
  const [priceChangedOnly, setPriceChangedOnly] = useState(false);
  const [priceMin, setPriceMin] = useState(PRICE_SLIDER_MIN);
  const [priceMax, setPriceMax] = useState(PRICE_SLIDER_MAX);
  const [trackedStatusFilter, setTrackedStatusFilter] = useState("all");
  const [listingsPage, setListingsPage] = useState(1);
  const [selectedSearchOption, setSelectedSearchOption] = useState(null);
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const [searchActiveIndex, setSearchActiveIndex] = useState(0);
  const searchBoxRef = useRef(null);
  // We store only the lookup key (locationId + id) and derive the live listing object from
  // the current alerts data — that way the detail view automatically reflects fresh prices,
  // tracking state changes, and history updates without a setState-in-effect ping-pong.
  const [selectedListingKey, setSelectedListingKey] = useState(null);
  // When a building is selected, show its listings instead of the buildings table
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const hasTrackedUnits = alerts.stats.trackedListingCount > 0;
  const buildingFilterOptions = alerts.watchedBuildings ?? EMPTY_OPTIONS;
  const autoTracking = alerts.autoTracking;
  const searchOptions = alerts.searchResults ?? EMPTY_OPTIONS;
  const effectiveTrackedOnly = autoTracking ? false : trackedOnly;
  const viewTab = selectedBuildingId ? "listings" : "buildings";
  const effectiveListingBuildingFilter = selectedBuildingId || "all";

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
    setSelectedBuildingId(building.locationId || null);
    setListingsPage(1);
  }

  function goBackToBuildings() {
    setSelectedBuildingId(null);
    setListingsPage(1);
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

  function handlePriceMinChange(value) {
    setListingsPage(1);
    setPriceMin(Math.min(value, priceMax));
  }

  function handlePriceMaxChange(value) {
    setListingsPage(1);
    setPriceMax(Math.max(value, priceMin));
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

  const priceDropsByBuilding = useMemo(() => {
    const map = new Map();
    const seen = new Set();
    for (const listing of [...(alerts.trackedListings || []), ...(alerts.latestListings || [])]) {
      const k = listing.key || listing.id;
      if (seen.has(k)) continue;
      seen.add(k);
      if (!Number.isFinite(listing.priceDelta) || listing.priceDelta >= 0) continue;
      const locId = listing.locationId;
      if (!locId) continue;
      map.set(locId, (map.get(locId) || 0) + 1);
    }
    return map;
  }, [alerts.trackedListings, alerts.latestListings]);

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

  // Compute actual price range for the selected building's listings (before price filter is applied)
  const buildingPriceRange = useMemo(() => {
    if (!selectedBuildingId) return { min: PRICE_SLIDER_MIN, max: PRICE_SLIDER_MAX };
    const seen = new Set();
    let lo = Infinity;
    let hi = -Infinity;
    for (const l of [...(alerts.latestListings || []), ...(alerts.trackedListings || [])]) {
      if (l.locationId !== selectedBuildingId) continue;
      const k = l.key || l.id;
      if (seen.has(k)) continue;
      seen.add(k);
      const price = l.currentStatus === "removed"
        ? l.lastKnownPrice
        : l.currentPrice ?? l.price ?? l.lastKnownPrice;
      if (!Number.isFinite(price)) continue;
      if (price < lo) lo = price;
      if (price > hi) hi = price;
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { min: PRICE_SLIDER_MIN, max: PRICE_SLIDER_MAX };
    const roundedMin = Math.floor(lo / PRICE_SLIDER_STEP) * PRICE_SLIDER_STEP;
    const roundedMax = Math.ceil(hi / PRICE_SLIDER_STEP) * PRICE_SLIDER_STEP;
    return { min: roundedMin, max: roundedMax };
  }, [selectedBuildingId, alerts.latestListings, alerts.trackedListings]);

  // Reset price slider to building's actual range when entering a building
  useEffect(() => {
    setPriceMin(buildingPriceRange.min);
    setPriceMax(buildingPriceRange.max);
  }, [buildingPriceRange.min, buildingPriceRange.max]);

  const listings = useMemo(() => {
    let source = [];

    if (!alerts.stats.watchedBuildingCount) {
      source = [];
    } else if (effectiveTrackedOnly || (trackedStatusFilter !== "all" && trackedStatusFilter !== "price-drops")) {
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
      if (trackedStatusFilter === "price-drops") {
        source = source.filter((l) => Number.isFinite(l.priceDelta) && l.priceDelta < 0);
      } else {
        source = source.filter((l) => {
          if (!l.isTracked && !l.currentStatus) return false;
          if (trackedStatusFilter === "removed") return l.currentStatus === "removed";
          return (l.currentStatus || "active") === "active";
        });
      }
    }

    if (priceChangedOnly) {
      source = source.filter((l) =>
        l.isTracked || l.currentStatus
          ? (l.dropsCount || 0) > 0 || (l.increasesCount || 0) > 0 || (Number.isFinite(l.priceDelta) && l.priceDelta !== 0)
          : Number.isFinite(l.priceDelta) && l.priceDelta !== 0,
      );
    }

    if (priceMin > buildingPriceRange.min || priceMax < buildingPriceRange.max) {
      source = source.filter((l) => {
        const price = l.currentStatus === "removed"
          ? l.lastKnownPrice
          : l.currentPrice ?? l.price ?? l.lastKnownPrice;
        if (!Number.isFinite(price)) return false;
        if (price < priceMin) return false;
        if (price > priceMax) return false;
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
    buildingPriceRange,
    priceMin,
    priceMax,
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
  const listingHeaderText = useMemo(() => {
    if (!alerts.stats.watchedBuildingCount) return "Watch a building to browse its apartments";
    const lastChecked = formatSyncTimestamp(alerts.alertSummary.lastCheckedAt);

    if (selectedBuildingId) {
      const seen = new Set();
      const buildingListings = [];
      for (const l of [...(alerts.trackedListings || []), ...(alerts.latestListings || [])]) {
        if (l.locationId !== selectedBuildingId) continue;
        const k = l.key || l.id;
        if (seen.has(k)) continue;
        seen.add(k);
        buildingListings.push(l);
      }
      const trackedCount = buildingListings.filter((l) => l.isTracked || l.currentStatus).length;
      const dropCount = buildingListings.filter((l) => Number.isFinite(l.priceDelta) && l.priceDelta < 0).length;
      const parts = [];
      if (trackedCount) parts.push(`${trackedCount} tracked ${trackedCount === 1 ? "unit" : "units"}`);
      if (dropCount) parts.push(`${dropCount} price ${dropCount === 1 ? "drop" : "drops"}`);
      parts.push(`last checked ${lastChecked}`);
      return parts.join(", ");
    }

    if (!hasTrackedUnits) return `Pick the exact units you care about, last checked ${lastChecked}`;
    return `${alerts.stats.trackedListingCount} tracked ${alerts.stats.trackedListingCount === 1 ? "unit" : "units"}, ${alerts.alertSummary.totalChanges} changes, last checked ${lastChecked}`;
  }, [alerts.stats.watchedBuildingCount, alerts.stats.trackedListingCount, alerts.alertSummary, alerts.trackedListings, alerts.latestListings, selectedBuildingId, hasTrackedUnits]);

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

  const safeSearchActiveIndex = searchOptions.length
    ? Math.min(searchActiveIndex, searchOptions.length - 1)
    : 0;
  const showSearchDropdown = !selectedBuildingId
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
      {selectedBuildingId ? (
        <div className="la-page-header">
          <div className="la-page-header-titles">
            <h1 className="la-page-title">{selectedBuildingOption?.buildingName || "Listings"}</h1>
            <p className="la-page-subtitle">{listingHeaderText}</p>
          </div>
        </div>
      ) : null}

      {!selectedBuildingId ? (
        <div className="toolbar" ref={searchBoxRef} style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search..."
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
                <div className="la-search-dropdown-state">No buildings match that search.</div>
              )}
            </div>
          ) : null}
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
        priceMin={priceMin}
        priceMax={priceMax}
        priceRangeMin={buildingPriceRange.min}
        priceRangeMax={buildingPriceRange.max}
        onPriceMinChange={handlePriceMinChange}
        onPriceMaxChange={handlePriceMaxChange}
        hasTrackedUnits={hasTrackedUnits}
      />

      {alerts.searchError && !selectedBuildingId ? (
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
          {!selectedBuildingId ? "Searching Bayut..." : "Refreshing listings..."}
        </div>
      ) : null}

      {showSkeletonList ? (
        <div className="la-list" aria-busy="true">
          {Array.from({ length: 6 }).map((_, index) => (
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
          ))}
        </div>
      ) : showEmpty ? (
        <div className="la-empty">
          <div className="la-empty-title">
            {!selectedBuildingId ? "No buildings match" : "No listings match"}
          </div>
          <div className="la-empty-text">
            {!selectedBuildingId
              ? "Try a broader search term, or switch off the Watching filter."
              : hasTrackedUnits
                ? "Try another filter, or switch off Tracked only to browse more live units."
                : "No listings found for this building."}
          </div>
        </div>
      ) : (
        <div className="lead-table-wrap">
          <table className="lead-table">
            <thead>
              <tr>
                {viewTab === "buildings" ? (
                  <>
                    <th>Building</th>
                    <th>Listings</th>
                    <th>Price</th>
                    <th>Action</th>
                  </>
                ) : (
                  <>
                    <th style={{ width: 52 }}></th>
                    <th>Title</th>
                    <th>Building</th>
                    <th>Details</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Link</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                if (viewTab === "buildings") {
                  const changeCount = changeCountByBuilding.get(item.locationId)
                    || changeCountByBuilding.get(item.key)
                    || 0;
                  const priceDropCount = priceDropsByBuilding.get(item.locationId) || 0;
                  return (
                    <BuildingRow
                      key={String(item.locationId || item.key || index)}
                      building={item}
                      isWatched={alerts.watchedSet?.has(item.locationId)}
                      watchDisabled={!alerts.watchedSet?.has(item.locationId) && alerts.stats.watchedBuildingCount >= alerts.watchLimit}
                      onToggleWatch={() => alerts.actions.toggleWatch(item)}
                      onPress={() => openBuildingListings(item)}
                      priceDropCount={priceDropCount}
                    />
                  );
                }
                return (
                  <ListingHistoryRow
                    key={String(item.key || `${item.buildingKey || ""}-${item.id || index}`)}
                    listing={item}
                    onPress={() => openListingDetails(item)}
                    onOpenExternal={() => openListing(item.bayutUrl)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
