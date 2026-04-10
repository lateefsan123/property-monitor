import { useEffect, useMemo, useRef, useState } from "react";
import { fetchBayutWatchedBuildings, searchBayutAlertLocations } from "./api";
import {
  buildListingAlertsState,
  createTrackedListingKey,
  createEmptyListingAlertsState,
  LISTING_ALERTS_STATE_KEY,
  parseListingAlertsState,
  parseSelectedListingKeys,
  SELECTED_LISTINGS_KEY,
  WATCHED_BUILDINGS_KEY,
} from "./change-detection";

const DEFAULT_SUGGESTION_COUNT = 8;
const SEARCH_DEBOUNCE_MS = 350;
const MAX_WATCHED_BUILDINGS = 4;

const FEED_URL = `${import.meta.env.BASE_URL}data/listing-alerts-feed.json`;

function safeGetItem(key) {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota errors */
  }
}

function safeRemoveItem(key) {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function parseVerifiedAt(value) {
  if (!value) return 0;
  const parsed = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function sortBuildings(left, right) {
  const verifiedDelta = parseVerifiedAt(right.latestVerifiedAt) - parseVerifiedAt(left.latestVerifiedAt);
  if (verifiedDelta !== 0) return verifiedDelta;
  return (right.listingCount || 0) - (left.listingCount || 0);
}

function sortListings(left, right) {
  const verifiedDelta = parseVerifiedAt(right.verifiedAt) - parseVerifiedAt(left.verifiedAt);
  if (verifiedDelta !== 0) return verifiedDelta;
  return (right.price || 0) - (left.price || 0);
}

function sortTrackedListings(left, right) {
  if (left.currentStatus !== right.currentStatus) return left.currentStatus === "active" ? -1 : 1;

  const changedDelta = parseVerifiedAt(right.lastChangeAt || right.lastSeenAt || right.removedAt)
    - parseVerifiedAt(left.lastChangeAt || left.lastSeenAt || left.removedAt);
  if (changedDelta !== 0) return changedDelta;

  if ((right.totalChanges || 0) !== (left.totalChanges || 0)) {
    return (right.totalChanges || 0) - (left.totalChanges || 0);
  }

  return (right.lastKnownPrice || 0) - (left.lastKnownPrice || 0);
}

function matchesSearch(building, term) {
  if (!term) return true;
  const haystack = [
    building.buildingName,
    building.searchName,
    ...((building.listings || []).map((listing) => listing.cluster || "")),
    ...((building.listings || []).map((listing) => listing.community || "")),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(term);
}

function toLocationId(value) {
  if (value == null) return null;
  return String(value).trim() || null;
}

function snapshotToCurrentBuilding(building) {
  return {
    ...building,
    listings: Object.values(building?.listings || {}),
  };
}

function filterSelectedKeysForWatched(keys, watchedItems) {
  const watchedLocationSet = new Set((watchedItems || []).map((item) => toLocationId(item.locationId)).filter(Boolean));
  return parseSelectedListingKeys(keys).filter((key) => watchedLocationSet.has(key.split(":")[0]));
}

function normalizeWatchedItem(item, feedBuildings) {
  if (!item) return null;

  if (typeof item === "string") {
    const feedMatch = feedBuildings.find((building) => building.key === item || building.locationId === item);
    if (!feedMatch) return null;

    return {
      locationId: feedMatch.locationId,
      buildingName: feedMatch.buildingName,
      searchName: feedMatch.searchName,
      fullPath: null,
    };
  }

  const locationId = toLocationId(item.locationId);
  if (!locationId) return null;

  return {
    locationId,
    buildingName: String(item.buildingName || item.searchName || "").trim() || "Unknown",
    searchName: String(item.searchName || item.buildingName || "").trim() || "Unknown",
    fullPath: String(item.fullPath || "").trim() || null,
  };
}

function uniqueWatchedItems(items, feedBuildings) {
  const seen = new Set();
  const deduped = [];

  for (const item of items) {
    const normalized = normalizeWatchedItem(item, feedBuildings);
    if (!normalized || seen.has(normalized.locationId)) continue;
    seen.add(normalized.locationId);
    deduped.push(normalized);
  }

  return deduped;
}

function toFallbackWatchedBuilding(item, buildingMap) {
  const feedMatch = buildingMap[item.locationId];
  if (feedMatch) {
    return {
      ...feedMatch,
      locationId: item.locationId,
      buildingName: item.buildingName || feedMatch.buildingName,
      searchName: item.searchName || feedMatch.searchName,
      fullPath: item.fullPath || feedMatch.fullPath || null,
    };
  }

  return {
    key: item.locationId,
    locationId: item.locationId,
    buildingName: item.buildingName || item.searchName || "Unknown",
    searchName: item.searchName || item.buildingName || "Unknown",
    fullPath: item.fullPath || null,
    imageUrl: null,
    listingCount: null,
    latestVerifiedAt: null,
    lowestPrice: null,
    highestPrice: null,
    listings: [],
  };
}

export function useListingAlerts() {
  const [feed, setFeed] = useState({ buildings: [], generatedAt: null });
  const [watchedItems, setWatchedItems] = useState([]);
  const [selectedListingKeys, setSelectedListingKeys] = useState([]);
  const [watchedBuildingsRemote, setWatchedBuildingsRemote] = useState([]);
  const [changeState, setChangeState] = useState(() => createEmptyListingAlertsState());
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [watchedLoading, setWatchedLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [watchError, setWatchError] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const changeStateRef = useRef(createEmptyListingAlertsState());
  const selectedListingKeysRef = useRef([]);

  // Load static feed JSON once at mount.
  useEffect(() => {
    let isActive = true;
    fetch(FEED_URL)
      .then((res) => (res.ok ? res.json() : { buildings: [], generatedAt: null }))
      .then((data) => {
        if (!isActive) return;
        const buildings = (data.buildings || [])
          .map((building) => ({ ...building, locationId: toLocationId(building.locationId) }))
          .filter((building) => building.locationId)
          .sort(sortBuildings);
        setFeed({ buildings, generatedAt: data.generatedAt || null });
      })
      .catch(() => {
        if (!isActive) return;
        setFeed({ buildings: [], generatedAt: null });
      });
    return () => {
      isActive = false;
    };
  }, []);

  const feedBuildings = feed.buildings;

  // Hydrate from localStorage once the feed has loaded (so normalizeWatchedItem can find feed matches).
  useEffect(() => {
    let isActive = true;

    function loadLocalState() {
      try {
        const rawWatchlist = safeGetItem(WATCHED_BUILDINGS_KEY);
        const rawAlertState = safeGetItem(LISTING_ALERTS_STATE_KEY);
        const rawSelectedListings = safeGetItem(SELECTED_LISTINGS_KEY);
        if (!isActive) return;

        let initialWatchedItems = [];
        if (rawWatchlist) {
          const parsedWatchlist = JSON.parse(rawWatchlist);
          if (Array.isArray(parsedWatchlist)) {
            initialWatchedItems = uniqueWatchedItems(parsedWatchlist, feedBuildings);
            setWatchedItems(initialWatchedItems);
          }
        }

        const initialSelectedKeys = filterSelectedKeysForWatched(rawSelectedListings, initialWatchedItems);
        selectedListingKeysRef.current = initialSelectedKeys;
        setSelectedListingKeys(initialSelectedKeys);

        const parsedAlertState = parseListingAlertsState(rawAlertState);
        changeStateRef.current = parsedAlertState;
        setChangeState(parsedAlertState);
      } catch {
        const emptyState = createEmptyListingAlertsState();
        changeStateRef.current = emptyState;
        setChangeState(emptyState);
      } finally {
        if (isActive) setHydrated(true);
      }
    }

    loadLocalState();

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    safeSetItem(WATCHED_BUILDINGS_KEY, JSON.stringify(watchedItems));
  }, [hydrated, watchedItems]);

  useEffect(() => {
    changeStateRef.current = changeState;
  }, [changeState]);

  useEffect(() => {
    selectedListingKeysRef.current = selectedListingKeys;
  }, [selectedListingKeys]);

  useEffect(() => {
    if (!hydrated) return;
    safeSetItem(SELECTED_LISTINGS_KEY, JSON.stringify(selectedListingKeys));
  }, [hydrated, selectedListingKeys]);

  useEffect(() => {
    const query = searchTerm.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return undefined;
    }

    let isActive = true;
    setSearchLoading(true);
    setSearchError(null);

    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchBayutAlertLocations(query);
        if (!isActive) return;
        setSearchResults(results.map((item) => normalizeWatchedItem(item, feedBuildings)).filter(Boolean));
      } catch (error) {
        if (!isActive) return;
        setSearchResults([]);
        setSearchError(error.message);
      } finally {
        if (isActive) setSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [searchTerm, feedBuildings]);

  useEffect(() => {
    if (!hydrated) return undefined;
    if (!watchedItems.length) {
      const emptyState = createEmptyListingAlertsState();
      setWatchedBuildingsRemote([]);
      setWatchedLoading(false);
      setWatchError(null);
      setChangeState(emptyState);
      changeStateRef.current = emptyState;
      safeRemoveItem(LISTING_ALERTS_STATE_KEY);
      return undefined;
    }

    let isActive = true;
    setWatchedLoading(true);
    setWatchError(null);

    async function loadWatchedBuildings() {
      try {
        const buildings = await fetchBayutWatchedBuildings(watchedItems);
        if (!isActive) return;
        const normalizedBuildings = buildings.map((building) => ({ ...building, locationId: toLocationId(building.locationId) })).sort(sortBuildings);
        const nextChangeState = buildListingAlertsState({
          currentBuildings: normalizedBuildings,
          previousState: changeStateRef.current,
          watchedItems,
          selectedListingKeys: selectedListingKeysRef.current,
        });

        setWatchedBuildingsRemote(normalizedBuildings);
        setChangeState(nextChangeState);
        changeStateRef.current = nextChangeState;
        safeSetItem(LISTING_ALERTS_STATE_KEY, JSON.stringify(nextChangeState));
      } catch (error) {
        if (!isActive) return;
        setWatchedBuildingsRemote([]);
        setWatchError(error.message);
      } finally {
        if (isActive) setWatchedLoading(false);
      }
    }

    void loadWatchedBuildings();

    return () => {
      isActive = false;
    };
  }, [hydrated, refreshNonce, watchedItems]);

  const buildingMap = useMemo(() => {
    const next = {};
    for (const building of feedBuildings) next[building.locationId] = building;
    return next;
  }, [feedBuildings]);

  const watchedSet = useMemo(() => new Set(watchedItems.map((item) => item.locationId)), [watchedItems]);
  const selectedListingSet = useMemo(() => new Set(selectedListingKeys), [selectedListingKeys]);

  const watchedBuildings = useMemo(() => {
    const remoteMap = {};
    for (const building of watchedBuildingsRemote) {
      const locationId = toLocationId(building.locationId);
      if (locationId) remoteMap[locationId] = building;
    }

    return watchedItems
      .map((item) => ({
        ...(remoteMap[item.locationId] || toFallbackWatchedBuilding(item, buildingMap)),
        changeSummary: changeState.buildingChanges[item.locationId] || null,
      }))
      .filter(Boolean)
      .sort(sortBuildings);
  }, [buildingMap, changeState.buildingChanges, watchedBuildingsRemote, watchedItems]);

  const searchValue = searchTerm.trim().toLowerCase();
  const usingLiveSearch = searchTerm.trim().length >= 2;

  const popularBuildings = useMemo(
    () => feedBuildings.filter((building) => !watchedSet.has(building.locationId) && matchesSearch(building, searchValue)).slice(0, DEFAULT_SUGGESTION_COUNT),
    [feedBuildings, searchValue, watchedSet],
  );

  const latestListings = useMemo(() => {
    if (!watchedBuildings.length) return [];

    return watchedBuildings
      .flatMap((building) =>
        (building.listings || []).map((listing) => {
          const trackedKey = createTrackedListingKey(building.locationId, listing.id);
          const historyEntry = trackedKey ? changeState.listingHistory?.[trackedKey] : null;

          return {
            ...listing,
            key: trackedKey || `${building.locationId}:${listing.id}`,
            locationId: building.locationId,
            buildingKey: building.key || building.locationId,
            buildingName: building.buildingName,
            buildingImageUrl: building.imageUrl,
            buildingListingCount: building.listingCount,
            trackedKey,
            isTracked: trackedKey ? selectedListingSet.has(trackedKey) : false,
            previousPrice: historyEntry?.previousPrice ?? null,
            priceDelta: historyEntry?.priceDelta ?? null,
            currentStatus: historyEntry?.currentStatus ?? null,
            currentPrice: historyEntry?.currentPrice ?? null,
            lastKnownPrice: historyEntry?.lastKnownPrice ?? null,
            lastSeenAt: historyEntry?.lastSeenAt ?? null,
            lastVerifiedAt: historyEntry?.lastVerifiedAt ?? listing.verifiedAt ?? null,
            firstSeenAt: historyEntry?.firstSeenAt ?? null,
            totalChanges: historyEntry?.totalChanges ?? 0,
            dropsCount: historyEntry?.dropsCount ?? 0,
            increasesCount: historyEntry?.increasesCount ?? 0,
            removedCount: historyEntry?.removedCount ?? 0,
            reappearedCount: historyEntry?.reappearedCount ?? 0,
            priceHistory: historyEntry?.priceHistory || [],
            historyEntry: historyEntry || null,
          };
        }),
      )
      .sort(sortListings);
  }, [changeState.listingHistory, selectedListingSet, watchedBuildings]);

  const trackedListings = useMemo(
    () =>
      Object.values(changeState.listingHistory || {})
        .filter((entry) => watchedSet.has(entry.locationId) && selectedListingSet.has(entry.key))
        .map((entry) => ({
          ...entry,
          price: entry.currentStatus === "active" ? entry.currentPrice : entry.lastKnownPrice,
          buildingKey: entry.locationId,
        }))
        .sort(sortTrackedListings),
    [changeState.listingHistory, selectedListingSet, watchedSet],
  );

  const stats = useMemo(() => {
    const totalListings = watchedBuildings.reduce((sum, building) => sum + (building.listingCount || 0), 0);
    return {
      watchedBuildingCount: watchedItems.length,
      watchedListingCount: totalListings,
      trackedListingCount: selectedListingKeys.length,
      freshestListingAt: latestListings[0]?.verifiedAt || null,
      generatedAt: feed.generatedAt || null,
    };
  }, [feed.generatedAt, latestListings, selectedListingKeys.length, watchedBuildings, watchedItems.length]);

  const alertSummary = useMemo(
    () => ({
      ...changeState.summary,
      watchedBuildingCount: watchedItems.length || changeState.summary.watchedBuildingCount,
      trackedListingCount: selectedListingKeys.length || changeState.summary.trackedListingCount,
    }),
    [changeState.summary, selectedListingKeys.length, watchedItems.length],
  );

  function rebuildChangeState(nextSelectedListingKeys, nextWatchedItems = watchedItems) {
    if (!nextWatchedItems.length) return;

    const currentBuildingsSource = watchedBuildingsRemote.length
      ? watchedBuildingsRemote
      : Object.values(changeStateRef.current.snapshot || {}).map(snapshotToCurrentBuilding);

    const nextChangeState = buildListingAlertsState({
      currentBuildings: currentBuildingsSource,
      previousState: changeStateRef.current,
      watchedItems: nextWatchedItems,
      selectedListingKeys: nextSelectedListingKeys,
      checkedAt: changeStateRef.current.summary?.lastCheckedAt || new Date().toISOString(),
    });

    setChangeState(nextChangeState);
    changeStateRef.current = nextChangeState;
    if (hydrated) safeSetItem(LISTING_ALERTS_STATE_KEY, JSON.stringify(nextChangeState));
  }

  function toggleWatch(item) {
    const normalized = normalizeWatchedItem(item, feedBuildings);
    if (!normalized) return;

    const removing = watchedSet.has(normalized.locationId);
    if (!removing && watchedItems.length >= MAX_WATCHED_BUILDINGS) {
      setWatchError(`You can watch up to ${MAX_WATCHED_BUILDINGS} buildings.`);
      return false;
    }

    const nextWatchedItems = removing
      ? watchedItems.filter((entry) => entry.locationId !== normalized.locationId)
      : [...watchedItems, normalized];

    setWatchError(null);
    setWatchedItems(nextWatchedItems);

    if (!removing) return true;

    const nextSelectedListingKeys = selectedListingKeys.filter((key) => key.split(":")[0] !== normalized.locationId);
    setSelectedListingKeys(nextSelectedListingKeys);

    if (!nextWatchedItems.length) {
      const emptyState = createEmptyListingAlertsState();
      setChangeState(emptyState);
      changeStateRef.current = emptyState;
      safeRemoveItem(LISTING_ALERTS_STATE_KEY);
    } else {
      rebuildChangeState(nextSelectedListingKeys, nextWatchedItems);
    }

    return true;
  }

  function toggleListingSelection(listing) {
    const trackedKey = createTrackedListingKey(listing?.locationId, listing?.id);
    if (!trackedKey) return;

    const nextSelectedListingKeys = selectedListingSet.has(trackedKey)
      ? selectedListingKeys.filter((key) => key !== trackedKey)
      : [...selectedListingKeys, trackedKey];

    setSelectedListingKeys(nextSelectedListingKeys);
    rebuildChangeState(nextSelectedListingKeys);
  }

  function refresh() {
    if (!watchedItems.length || watchedLoading) return;
    setRefreshNonce((current) => current + 1);
  }

  return {
    alertSummary,
    changeItems: changeState.changeItems,
    generatedAt: feed.generatedAt || null,
    hydrated,
    latestListings,
    popularBuildings,
    searchError,
    searchLoading,
    searchResults,
    searchTerm,
    sourceLabel: "Bayut",
    stats,
    trackedListings,
    usingLiveSearch,
    watchLimit: MAX_WATCHED_BUILDINGS,
    watchError,
    watchedBuildings,
    watchedLoading,
    selectedListingKeys,
    selectedListingSet,
    watchedSet,
    actions: {
      refresh,
      setSearchTerm,
      toggleListingSelection,
      toggleWatch,
    },
  };
}
