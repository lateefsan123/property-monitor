import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatSyncTimestamp } from "../formatters";
import { useListingAlerts } from "../useListingAlerts";
import ListingAlertsFilters, {
  LISTINGS_PAGE_SIZE,
  getPricePreset,
} from "./ListingAlertsFilters";
import ListingAlertsResults from "./ListingAlertsResults";
import ListingAlertsSearchBox from "./ListingAlertsSearchBox";
import ListingDetailPage from "./ListingDetailPage";

const EMPTY_OPTIONS = [];
const LAYOUTS = [
  { id: "grid", label: "Grid" },
  { id: "list", label: "List" },
  { id: "map", label: "Map" },
];
const LAYOUT_STORAGE_KEY = "listing-alerts:layout";

function loadInitialLayout() {
  if (typeof window === "undefined") return "list";
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    return LAYOUTS.some((l) => l.id === raw) ? raw : "list";
  } catch {
    return "list";
  }
}

function useTopbarHost(elementId) {
  const [host, setHost] = useState(() =>
    typeof document === "undefined" ? null : document.getElementById(elementId),
  );

  useEffect(() => {
    if (host || typeof document === "undefined") return undefined;
    let cancelled = false;
    const attempt = () => {
      if (cancelled) return;
      const el = document.getElementById(elementId);
      if (el) setHost(el);
    };
    attempt();
    const raf = window.requestAnimationFrame(attempt);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [elementId, host]);

  return host;
}

function TopbarActionsPortal({ children }) {
  const host = useTopbarHost("app-topbar-actions");
  if (!host) return null;
  return createPortal(children, host);
}

function TopbarCrumbExtraPortal({ children }) {
  const host = useTopbarHost("app-topbar-crumb-extra");
  if (!host) return null;
  return createPortal(children, host);
}

function BuildingCrumbIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="5 12 10 17 19 7" />
    </svg>
  );
}

function LayoutMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleDocClick(event) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(event.target)) setOpen(false);
    }
    function handleKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="sheet-sort" ref={wrapRef}>
      <button
        type="button"
        className={`sheet-sort-btn${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Change layout"
        title="Change layout"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <div className="sheet-sort-menu" role="menu">
          <div className="sheet-sort-menu-label">Layout</div>
          {LAYOUTS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={value === option.id}
              className={`sheet-sort-item${value === option.id ? " is-selected" : ""}`}
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {value === option.id && <CheckIcon />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ListingAlertsPage() {
  const alerts = useListingAlerts();
  const [layout, setLayout] = useState(loadInitialLayout);
  const searchInputRef = useRef(null);
  const [watchingOnly, setWatchingOnly] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
    } catch {
      /* ignore */
    }
  }, [layout]);

  function handleFocusSearch() {
    const input = searchInputRef.current;
    if (!input) return;
    input.focus();
    if (typeof input.scrollIntoView === "function") {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (typeof input.select === "function") input.select();
  }

  const [trackedOnly, setTrackedOnly] = useState(false);
  const [priceChangedOnly, setPriceChangedOnly] = useState(false);
  const [newOnly, setNewOnly] = useState(false);
  const [pricePreset, setPricePreset] = useState("any");
  const [trackedStatusFilter, setTrackedStatusFilter] = useState("all");
  const [listingsPage, setListingsPage] = useState(1);
  const [selectedSearchOption, setSelectedSearchOption] = useState(null);
  const [selectedListingKey, setSelectedListingKey] = useState(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);

  useEffect(() => {
    function handleCrumbClick(event) {
      if (event?.detail !== "listing-alerts") return;
      setSelectedBuildingId(null);
      setSelectedListingKey(null);
      setListingsPage(1);
    }
    window.addEventListener("app-crumb-click", handleCrumbClick);
    return () => window.removeEventListener("app-crumb-click", handleCrumbClick);
  }, []);

  const hasTrackedUnits = alerts.stats.trackedListingCount > 0;
  const buildingFilterOptions = alerts.watchedBuildings ?? EMPTY_OPTIONS;
  const autoTracking = alerts.autoTracking;
  const searchOptions = alerts.searchResults ?? EMPTY_OPTIONS;
  const effectiveTrackedOnly = autoTracking ? false : trackedOnly;
  const viewTab = selectedBuildingId ? "listings" : "buildings";
  const effectiveListingBuildingFilter = selectedBuildingId || "all";

  const selectedListing = useMemo(() => {
    if (!selectedListingKey) return null;
    return [...(alerts.latestListings || []), ...(alerts.trackedListings || [])].find(
      (item) => item.key === selectedListingKey || `${item.locationId}:${item.id}` === selectedListingKey,
    ) || null;
  }, [alerts.latestListings, alerts.trackedListings, selectedListingKey]);

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

  const priceDropsByBuilding = useMemo(() => {
    const map = new Map();
    const seen = new Set();
    for (const listing of [...(alerts.trackedListings || []), ...(alerts.latestListings || [])]) {
      const key = listing.key || listing.id;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!Number.isFinite(listing.priceDelta) || listing.priceDelta >= 0) continue;
      if (!listing.locationId) continue;
      map.set(listing.locationId, (map.get(listing.locationId) || 0) + 1);
    }
    return map;
  }, [alerts.latestListings, alerts.trackedListings]);

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
      source = source.filter((listing) => listing.locationId === effectiveListingBuildingFilter);
    }

    if (watchingOnly && alerts.watchedSet?.size) {
      source = source.filter((listing) => alerts.watchedSet.has(listing.locationId));
    }

    if (effectiveTrackedOnly) {
      source = source.filter((listing) => listing.isTracked || listing.currentStatus);
    }

    if (trackedStatusFilter !== "all") {
      if (trackedStatusFilter === "price-drops") {
        source = source.filter((listing) => Number.isFinite(listing.priceDelta) && listing.priceDelta < 0);
      } else {
        source = source.filter((listing) => {
          if (!listing.isTracked && !listing.currentStatus) return false;
          if (trackedStatusFilter === "removed") return listing.currentStatus === "removed";
          return (listing.currentStatus || "active") === "active";
        });
      }
    }

    if (priceChangedOnly) {
      source = source.filter((listing) =>
        listing.isTracked || listing.currentStatus
          ? (listing.dropsCount || 0) > 0 || (listing.increasesCount || 0) > 0 || (Number.isFinite(listing.priceDelta) && listing.priceDelta !== 0)
          : Number.isFinite(listing.priceDelta) && listing.priceDelta !== 0,
      );
    }

    if (newOnly) {
      const newKeys = new Set(
        (alerts.changeItems || [])
          .filter((change) => change.type === "new")
          .map((change) => `${change.locationId}:${change.id}`),
      );
      source = source.filter((listing) => newKeys.has(listing.key) || newKeys.has(`${listing.locationId}:${listing.id}`));
    }

    const preset = getPricePreset(pricePreset);
    if (preset.min != null || preset.max != null) {
      source = source.filter((listing) => {
        const price = listing.currentStatus === "removed"
          ? listing.lastKnownPrice
          : listing.currentPrice ?? listing.price ?? listing.lastKnownPrice;
        if (!Number.isFinite(price)) return false;
        if (preset.min != null && price < preset.min) return false;
        if (preset.max != null && price > preset.max) return false;
        return true;
      });
    }

    return source;
  }, [
    alerts.changeItems,
    alerts.latestListings,
    alerts.stats.watchedBuildingCount,
    alerts.trackedListings,
    alerts.watchedSet,
    effectiveListingBuildingFilter,
    effectiveTrackedOnly,
    newOnly,
    pricePreset,
    priceChangedOnly,
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
      for (const listing of [...(alerts.trackedListings || []), ...(alerts.latestListings || [])]) {
        if (listing.locationId !== selectedBuildingId) continue;
        const key = listing.key || listing.id;
        if (seen.has(key)) continue;
        seen.add(key);
        buildingListings.push(listing);
      }
      const trackedCount = buildingListings.filter((listing) => listing.isTracked || listing.currentStatus).length;
      const dropCount = buildingListings.filter((listing) => Number.isFinite(listing.priceDelta) && listing.priceDelta < 0).length;
      const parts = [];
      if (trackedCount) parts.push(`${trackedCount} tracked ${trackedCount === 1 ? "unit" : "units"}`);
      if (dropCount) parts.push(`${dropCount} price ${dropCount === 1 ? "drop" : "drops"}`);
      parts.push(`last checked ${lastChecked}`);
      return parts.join(", ");
    }

    if (!hasTrackedUnits) return `Pick the exact units you care about, last checked ${lastChecked}`;
    return `${alerts.stats.trackedListingCount} tracked ${alerts.stats.trackedListingCount === 1 ? "unit" : "units"}, ${alerts.alertSummary.totalChanges} changes, last checked ${lastChecked}`;
  }, [alerts.alertSummary, alerts.latestListings, alerts.stats, alerts.trackedListings, hasTrackedUnits, selectedBuildingId]);

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

  const crumbBuilding = (() => {
    if (selectedListing?.locationId) {
      const match = (alerts.watchedBuildings || []).find((b) => b.locationId === selectedListing.locationId);
      return {
        locationId: selectedListing.locationId,
        name: match?.buildingName || selectedListing.buildingName || "Building",
        clickable: true,
      };
    }
    if (selectedBuildingId) {
      const name = selectedBuildingOption?.buildingName
        || (alerts.watchedBuildings || []).find((b) => b.locationId === selectedBuildingId)?.buildingName
        || "Building";
      return { locationId: selectedBuildingId, name, clickable: false };
    }
    return null;
  })();

  const crumbExtra = crumbBuilding ? (
    <TopbarCrumbExtraPortal>
      <span className="app-crumb-sep">/</span>
      {crumbBuilding.clickable ? (
        <button
          type="button"
          className="app-crumb-sub app-crumb-btn"
          onClick={() => {
            setSelectedBuildingId(crumbBuilding.locationId);
            setSelectedListingKey(null);
            setListingsPage(1);
          }}
          title={`Back to ${crumbBuilding.name}`}
        >
          <BuildingCrumbIcon />
          <span className="app-crumb-label">{crumbBuilding.name}</span>
        </button>
      ) : (
        <span className="app-crumb-sub">
          <BuildingCrumbIcon />
          <span className="app-crumb-label" title={crumbBuilding.name}>{crumbBuilding.name}</span>
        </span>
      )}
    </TopbarCrumbExtraPortal>
  ) : null;

  if (selectedListing) {
    return (
      <>
        {crumbExtra}
        <ListingDetailPage
          listing={selectedListing}
          onBack={() => setSelectedListingKey(null)}
          onOpenExternal={() => {
            if (selectedListing.bayutUrl) window.open(selectedListing.bayutUrl, "_blank", "noopener,noreferrer");
          }}
          onToggleTracking={() => alerts.actions.toggleListingSelection(selectedListing)}
          autoTracking={autoTracking}
        />
      </>
    );
  }

  const items = viewTab === "buildings" ? buildings : pagedListings;
  const isListLoading = (viewTab === "buildings" && alerts.searchLoading) || (viewTab === "listings" && alerts.watchedLoading);
  const showSkeletonList = isListLoading && items.length === 0;
  const showEmpty = items.length === 0 && !showSkeletonList;
  const showRefreshingStrip = isListLoading && items.length > 0;

  function openBuildingListings(building) {
    if (!building) return;
    if (!alerts.watchedSet?.has(building.locationId)) {
      const didWatch = alerts.actions.toggleWatch(building);
      if (!didWatch) return;
    }
    setSelectedBuildingId(building.locationId || null);
    setListingsPage(1);
  }

  function openListingDetails(listing) {
    if (!listing) return;
    setSelectedListingKey(listing.key || `${listing.locationId}:${listing.id}`);
  }

  return (
    <div className="la-page">
      {crumbExtra}

      <TopbarActionsPortal>
        <button
          type="button"
          className="sheet-topbar-new-btn"
          onClick={handleFocusSearch}
          disabled={Boolean(selectedBuildingId)}
          aria-label="Add building"
          title={selectedBuildingId ? "Back to buildings to add" : "Add building"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <LayoutMenu value={layout} onChange={setLayout} />
      </TopbarActionsPortal>

      {selectedBuildingId ? (
        <p className="la-page-subtitle">{listingHeaderText}</p>
      ) : null}

      <div className="toolbar">
        <div className="toolbar-row">
          <ListingAlertsSearchBox
            visible={!selectedBuildingId}
            inputRef={searchInputRef}
            searchTerm={alerts.searchTerm}
            searchLoading={alerts.searchLoading}
            searchError={alerts.searchError}
            searchOptions={searchOptions}
            selectedOption={selectedSearchBuilding}
            onSearchTermChange={alerts.actions.setSearchTerm}
            onSelectOption={setSelectedSearchOption}
          />

          <ListingAlertsFilters
            viewTab={viewTab}
            watchingOnly={watchingOnly}
            setWatchingOnly={(nextValue) => {
              setListingsPage(1);
              setWatchingOnly(nextValue);
            }}
            trackedOnly={effectiveTrackedOnly}
            setTrackedOnly={(nextValue) => {
              setListingsPage(1);
              setTrackedOnly(nextValue);
            }}
            showTrackedToggle={!autoTracking}
            priceChangedOnly={priceChangedOnly}
            setPriceChangedOnly={(nextValue) => {
              setListingsPage(1);
              setPriceChangedOnly(nextValue);
            }}
            newOnly={newOnly}
            setNewOnly={(nextValue) => {
              setListingsPage(1);
              setNewOnly(nextValue);
            }}
            trackedStatusFilter={trackedStatusFilter}
            setTrackedStatusFilter={(nextValue) => {
              setListingsPage(1);
              setTrackedStatusFilter(nextValue);
            }}
            pricePreset={pricePreset}
            setPricePreset={(nextValue) => {
              setListingsPage(1);
              setPricePreset(nextValue);
            }}
          />
        </div>
      </div>

      {alerts.searchError && !selectedBuildingId ? <div className="la-error-box">{alerts.searchError}</div> : null}
      {alerts.watchError ? <div className="la-error-box">{alerts.watchError}</div> : null}

      <ListingAlertsResults
        alerts={alerts}
        layout={layout}
        count={count}
        countLabel={countLabel}
        hasTrackedUnits={hasTrackedUnits}
        items={items}
        listingSafePage={listingSafePage}
        listingTotalPages={listingTotalPages}
        listingVisibleEnd={listingVisibleEnd}
        listingVisibleStart={listingVisibleStart}
        onNextPage={() => setListingsPage((page) => Math.min(listingTotalPages, page + 1))}
        onOpenBuilding={openBuildingListings}
        onOpenListing={openListingDetails}
        onOpenListingExternal={(url) => {
          if (url) window.open(url, "_blank", "noopener,noreferrer");
        }}
        onPreviousPage={() => setListingsPage((page) => Math.max(1, page - 1))}
        priceDropsByBuilding={priceDropsByBuilding}
        selectedBuildingId={selectedBuildingId}
        showEmpty={showEmpty}
        showRefreshingStrip={showRefreshingStrip}
        showSkeletonList={showSkeletonList}
        totalLiveListings={totalLiveListings}
        totalLiveListingsLabel={totalLiveListingsLabel}
        viewTab={viewTab}
      />
    </div>
  );
}
