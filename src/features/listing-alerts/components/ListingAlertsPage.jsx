import { useEffect, useMemo, useState } from "react";
import { formatSyncTimestamp } from "../formatters";
import { useListingAlerts } from "../useListingAlerts";
import ListingAlertsFilters, {
  LISTINGS_PAGE_SIZE,
  PRICE_SLIDER_MAX,
  PRICE_SLIDER_MIN,
  PRICE_SLIDER_STEP,
} from "./ListingAlertsFilters";
import ListingAlertsResults from "./ListingAlertsResults";
import ListingAlertsSearchBox from "./ListingAlertsSearchBox";
import ListingDetailPage from "./ListingDetailPage";

const EMPTY_OPTIONS = [];

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
  const [selectedListingKey, setSelectedListingKey] = useState(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);

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

  const buildingPriceRange = useMemo(() => {
    if (!selectedBuildingId) return { min: PRICE_SLIDER_MIN, max: PRICE_SLIDER_MAX };
    const seen = new Set();
    let low = Infinity;
    let high = -Infinity;

    for (const listing of [...(alerts.latestListings || []), ...(alerts.trackedListings || [])]) {
      if (listing.locationId !== selectedBuildingId) continue;
      const key = listing.key || listing.id;
      if (seen.has(key)) continue;
      seen.add(key);

      const price = listing.currentStatus === "removed"
        ? listing.lastKnownPrice
        : listing.currentPrice ?? listing.price ?? listing.lastKnownPrice;
      if (!Number.isFinite(price)) continue;
      if (price < low) low = price;
      if (price > high) high = price;
    }

    if (!Number.isFinite(low) || !Number.isFinite(high)) {
      return { min: PRICE_SLIDER_MIN, max: PRICE_SLIDER_MAX };
    }

    return {
      min: Math.floor(low / PRICE_SLIDER_STEP) * PRICE_SLIDER_STEP,
      max: Math.ceil(high / PRICE_SLIDER_STEP) * PRICE_SLIDER_STEP,
    };
  }, [alerts.latestListings, alerts.trackedListings, selectedBuildingId]);

  useEffect(() => {
    if (!selectedBuildingId) return;
    setPriceMin(buildingPriceRange.min);
    setPriceMax(buildingPriceRange.max);
  }, [buildingPriceRange.max, buildingPriceRange.min, selectedBuildingId]);

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

    if (priceMin > buildingPriceRange.min || priceMax < buildingPriceRange.max) {
      source = source.filter((listing) => {
        const price = listing.currentStatus === "removed"
          ? listing.lastKnownPrice
          : listing.currentPrice ?? listing.price ?? listing.lastKnownPrice;
        return Number.isFinite(price) && price >= priceMin && price <= priceMax;
      });
    }

    return source;
  }, [
    alerts.latestListings,
    alerts.stats.watchedBuildingCount,
    alerts.trackedListings,
    alerts.watchedSet,
    buildingPriceRange.max,
    buildingPriceRange.min,
    effectiveListingBuildingFilter,
    effectiveTrackedOnly,
    priceMax,
    priceMin,
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

  if (selectedListing) {
    return (
      <ListingDetailPage
        listing={selectedListing}
        onBack={() => setSelectedListingKey(null)}
        onOpenExternal={() => {
          if (selectedListing.bayutUrl) window.open(selectedListing.bayutUrl, "_blank", "noopener,noreferrer");
        }}
        onToggleTracking={() => alerts.actions.toggleListingSelection(selectedListing)}
        autoTracking={autoTracking}
      />
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
      {selectedBuildingId ? (
        <div className="la-page-header">
          <div className="la-page-header-titles">
            <h1 className="la-page-title">{selectedBuildingOption?.buildingName || "Listings"}</h1>
            <p className="la-page-subtitle">{listingHeaderText}</p>
          </div>
        </div>
      ) : null}

      <ListingAlertsSearchBox
        visible={!selectedBuildingId}
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
        trackedStatusFilter={trackedStatusFilter}
        setTrackedStatusFilter={(nextValue) => {
          setListingsPage(1);
          setTrackedStatusFilter(nextValue);
        }}
        priceMin={priceMin}
        priceMax={priceMax}
        priceRangeMin={buildingPriceRange.min}
        priceRangeMax={buildingPriceRange.max}
        onPriceMinChange={(value) => {
          setListingsPage(1);
          setPriceMin(Math.min(value, priceMax));
        }}
        onPriceMaxChange={(value) => {
          setListingsPage(1);
          setPriceMax(Math.max(value, priceMin));
        }}
      />

      {alerts.searchError && !selectedBuildingId ? <div className="la-error-box">{alerts.searchError}</div> : null}
      {alerts.watchError ? <div className="la-error-box">{alerts.watchError}</div> : null}
      {alerts.alertSummary?.newListingCount > 0 ? (
        <div className="la-notice-box">
          {alerts.alertSummary.newListingCount} new {alerts.alertSummary.newListingCount === 1 ? "listing" : "listings"} added since the last check.
        </div>
      ) : null}

      <ListingAlertsResults
        alerts={alerts}
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
