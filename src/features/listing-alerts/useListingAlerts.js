import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchBayutWatchedBuildings, searchBayutAlertLocations } from "./api";
import { supabase } from "../../supabase";
import {
  buildListingAlertsState,
  createTrackedListingKey,
  createEmptyListingAlertsState,
  LISTING_ALERTS_STATE_KEY,
  parseListingAlertsState,
  parseSelectedListingKeys,
  SELECTED_LISTINGS_KEY,
  WATCHED_BUILDINGS_KEY,
  WATCHED_BUILDINGS_SNAPSHOT_KEY,
} from "./change-detection";

const DEFAULT_SUGGESTION_COUNT = 8;
const SEARCH_DEBOUNCE_MS = 350;
const MAX_WATCHED_BUILDINGS = 1000;
const AUTO_TRACK_ALL_LISTINGS = true;

const FEED_URL = `${import.meta.env.BASE_URL}data/listing-alerts-feed.json`;
const EMPTY_FEED = { buildings: [], generatedAt: null };
const EMPTY_LIST = [];

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

function getLoadedListingCount(building) {
  const loaded = building?.listings?.length || 0;
  if (loaded) return loaded;
  return Number.isFinite(building?.listingCount) ? building.listingCount : 0;
}

function getErrorMessage(error) {
  if (!error) return "Unexpected error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || "Unexpected error";
  if (typeof error?.message === "string") return error.message;
  if (typeof error?.error === "string") return error.error;
  if (typeof error?.error?.message === "string") return error.error.message;
  if (typeof error?.details === "string") return error.details;
  if (typeof error?.hint === "string") return error.hint;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
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

function snapshotToRemoteBuilding(building) {
  const listings = Object.values(building?.listings || {});
  let latestVerifiedAt = building?.latestVerifiedAt || null;
  const prices = [];

  for (const listing of listings) {
    if (Number.isFinite(listing?.price)) prices.push(listing.price);
    if (listing?.verifiedAt) {
      if (!latestVerifiedAt || parseVerifiedAt(listing.verifiedAt) > parseVerifiedAt(latestVerifiedAt)) {
        latestVerifiedAt = listing.verifiedAt;
      }
    }
  }

  return {
    ...building,
    listings,
    listingCount: listings.length
      ? listings.length
      : Number.isFinite(building?.listingCount)
        ? building.listingCount
        : 0,
    latestVerifiedAt,
    lowestPrice: Number.isFinite(building?.lowestPrice)
      ? building.lowestPrice
      : prices.length
        ? Math.min(...prices)
        : null,
    highestPrice: Number.isFinite(building?.highestPrice)
      ? building.highestPrice
      : prices.length
        ? Math.max(...prices)
        : null,
    imageUrl: building?.imageUrl || listings[0]?.coverPhoto || null,
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

async function fetchListingAlertsFeed({ signal }) {
  const response = await fetch(FEED_URL, { signal });
  if (!response.ok) return EMPTY_FEED;

  const data = await response.json();
  const buildings = (data.buildings || [])
    .map((building) => ({ ...building, locationId: toLocationId(building.locationId) }))
    .filter((building) => building.locationId)
    .sort(sortBuildings);

  return {
    buildings,
    generatedAt: data.generatedAt || null,
  };
}

async function fetchNormalizedWatchedBuildings(watchedItems, signal) {
  const buildings = await fetchBayutWatchedBuildings(watchedItems, { signal });
  return buildings
    .map((building) => ({ ...building, locationId: toLocationId(building.locationId) }))
    .sort(sortBuildings);
}

export function useListingAlerts() {
  const [watchedItems, setWatchedItems] = useState([]);
  const [selectedListingKeys, setSelectedListingKeys] = useState([]);
  const [watchedBuildingsRemote, setWatchedBuildingsRemote] = useState([]);
  const [changeState, setChangeState] = useState(() => createEmptyListingAlertsState());
  const [sessionUserId, setSessionUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [remoteWatchedLoading, setRemoteWatchedLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [watchError, setWatchError] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const changeStateRef = useRef(createEmptyListingAlertsState());
  const selectedListingKeysRef = useRef([]);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const remoteEnabled = Boolean(supabase && sessionUserId);
  const normalizedSearchTerm = deferredSearchTerm.trim();

  const feedQuery = useQuery({
    queryKey: ["listing-alerts-feed"],
    queryFn: fetchListingAlertsFeed,
    placeholderData: EMPTY_FEED,
    staleTime: 5 * 60 * 1000,
  });
  const feed = feedQuery.data || EMPTY_FEED;
  const feedBuildings = feed.buildings || EMPTY_LIST;

  useEffect(() => {
    if (!supabase) return undefined;

    let isActive = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isActive) return;
      setSessionUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isActive) return;
      setSessionUserId(session?.user?.id ?? null);
    });

    return () => {
      isActive = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function loadRemoteState({ showLoading = true } = {}) {
    if (!supabase || !sessionUserId) return;

    if (showLoading) setRemoteWatchedLoading(true);
    setWatchError(null);

    try {
      const [{ data: watchlistRows, error: watchlistError }, { data: trackedRows, error: trackedError }, { data: stateRow, error: stateError }] = await Promise.all([
        supabase
          .from("listing_alerts_watchlists")
          .select("location_id, building_name, search_name, full_path")
          .eq("user_id", sessionUserId),
        supabase
          .from("listing_alerts_tracked_listings")
          .select("location_id, listing_id")
          .eq("user_id", sessionUserId),
        supabase
          .from("listing_alerts_state")
          .select("summary, snapshot, change_items, listing_history")
          .eq("user_id", sessionUserId)
          .maybeSingle(),
      ]);

      if (watchlistError) throw watchlistError;
      if (trackedError) throw trackedError;
      if (stateError) throw stateError;

      const nextWatchedItems = (watchlistRows || [])
        .map((row) => normalizeWatchedItem({
          locationId: row.location_id,
          buildingName: row.building_name,
          searchName: row.search_name,
          fullPath: row.full_path,
        }, feedBuildings))
        .filter(Boolean);

      const nextSelectedKeys = parseSelectedListingKeys(
        (trackedRows || [])
          .map((row) => createTrackedListingKey(row.location_id, row.listing_id))
          .filter(Boolean),
      );

      const nextState = parseListingAlertsState(stateRow ? {
        summary: stateRow.summary || {},
        snapshot: stateRow.snapshot || {},
        changeItems: stateRow.change_items || [],
        listingHistory: stateRow.listing_history || {},
      } : null);

      setWatchedItems(nextWatchedItems);
      setSelectedListingKeys(nextSelectedKeys);
      selectedListingKeysRef.current = nextSelectedKeys;
      setChangeState(nextState);
      changeStateRef.current = nextState;

      const snapshotBuildings = Object.values(nextState.snapshot || {}).map(snapshotToRemoteBuilding).sort(sortBuildings);
      setWatchedBuildingsRemote(snapshotBuildings);

      safeSetItem(WATCHED_BUILDINGS_KEY, JSON.stringify(nextWatchedItems));
      safeSetItem(SELECTED_LISTINGS_KEY, JSON.stringify(nextSelectedKeys));
      safeSetItem(LISTING_ALERTS_STATE_KEY, JSON.stringify(nextState));

      const snapshotListingCount = snapshotBuildings.reduce((sum, building) => sum + (building.listings?.length || 0), 0);
      if ((!snapshotBuildings.length || snapshotListingCount === 0) && nextWatchedItems.length) {
        try {
          const buildings = await fetchBayutWatchedBuildings(nextWatchedItems);
          const normalizedBuildings = buildings.map((building) => ({ ...building, locationId: toLocationId(building.locationId) })).sort(sortBuildings);
          const nextFallbackState = buildListingAlertsState({
            currentBuildings: normalizedBuildings,
            previousState: nextState,
            watchedItems: nextWatchedItems,
            selectedListingKeys: nextSelectedKeys,
            trackAllListings: AUTO_TRACK_ALL_LISTINGS,
          });

          setWatchedBuildingsRemote(normalizedBuildings);
          setChangeState(nextFallbackState);
          changeStateRef.current = nextFallbackState;
          safeSetItem(LISTING_ALERTS_STATE_KEY, JSON.stringify(nextFallbackState));
        } catch {
          // ignore live fallback failure
        }
      }
    } catch (error) {
      setWatchError(getErrorMessage(error));
    } finally {
      if (showLoading) setRemoteWatchedLoading(false);
      setHydrated(true);
    }
  }

  // Hydrate from storage or Supabase once the feed has loaded.
  useEffect(() => {
    let isActive = true;

    function loadLocalState() {
      try {
        const rawWatchlist = safeGetItem(WATCHED_BUILDINGS_KEY);
        const rawAlertState = safeGetItem(LISTING_ALERTS_STATE_KEY);
        const rawSelectedListings = safeGetItem(SELECTED_LISTINGS_KEY);
        const rawWatchedSnapshot = safeGetItem(WATCHED_BUILDINGS_SNAPSHOT_KEY);
        if (!isActive) return;

        let initialWatchedItems = [];
        if (rawWatchlist) {
          const parsedWatchlist = JSON.parse(rawWatchlist);
          if (Array.isArray(parsedWatchlist)) {
            initialWatchedItems = uniqueWatchedItems(parsedWatchlist, feedBuildings);
            setWatchedItems(initialWatchedItems);
          }
        }

        if (rawWatchedSnapshot) {
          try {
            const parsedSnapshot = JSON.parse(rawWatchedSnapshot);
            if (Array.isArray(parsedSnapshot) && parsedSnapshot.length) {
              setWatchedBuildingsRemote(parsedSnapshot);
            }
          } catch {
            safeRemoveItem(WATCHED_BUILDINGS_SNAPSHOT_KEY);
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

    if (remoteEnabled) {
      void loadRemoteState();
    } else {
      loadLocalState();
    }

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedBuildings, remoteEnabled, sessionUserId]);

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

  const searchQuery = useQuery({
    queryKey: ["listing-alerts-search", normalizedSearchTerm],
    enabled: normalizedSearchTerm.length >= 2,
    placeholderData: (previousData) => previousData,
    queryFn: ({ signal }) => searchBayutAlertLocations(normalizedSearchTerm, { signal }),
    staleTime: SEARCH_DEBOUNCE_MS,
  });

  const searchResults = useMemo(() => {
    if (normalizedSearchTerm.length < 2) return EMPTY_LIST;
    return (searchQuery.data || EMPTY_LIST)
      .map((item) => normalizeWatchedItem(item, feedBuildings))
      .filter(Boolean);
  }, [feedBuildings, normalizedSearchTerm, searchQuery.data]);

  const localWatchedBuildingsQuery = useQuery({
    queryKey: ["listing-alerts-watched-buildings", refreshNonce, watchedItems],
    enabled: hydrated && !remoteEnabled && watchedItems.length > 0,
    placeholderData: (previousData) => previousData,
    queryFn: ({ signal }) => fetchNormalizedWatchedBuildings(watchedItems, signal),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!hydrated || remoteEnabled) return;
    if (!watchedItems.length) {
      const emptyState = createEmptyListingAlertsState();
      setWatchedBuildingsRemote([]);
      setWatchError(null);
      setChangeState(emptyState);
      changeStateRef.current = emptyState;
      safeRemoveItem(LISTING_ALERTS_STATE_KEY);
      safeRemoveItem(WATCHED_BUILDINGS_SNAPSHOT_KEY);
      return;
    }

    if (localWatchedBuildingsQuery.error) {
      setWatchError(getErrorMessage(localWatchedBuildingsQuery.error));
      return;
    }

    if (!localWatchedBuildingsQuery.data) return;

    const normalizedBuildings = localWatchedBuildingsQuery.data;
    const nextChangeState = buildListingAlertsState({
      currentBuildings: normalizedBuildings,
      previousState: changeStateRef.current,
      watchedItems,
      selectedListingKeys: selectedListingKeysRef.current,
      trackAllListings: AUTO_TRACK_ALL_LISTINGS,
    });

    setWatchError(null);
    setWatchedBuildingsRemote(normalizedBuildings);
    setChangeState(nextChangeState);
    changeStateRef.current = nextChangeState;
    safeSetItem(LISTING_ALERTS_STATE_KEY, JSON.stringify(nextChangeState));
    safeSetItem(WATCHED_BUILDINGS_SNAPSHOT_KEY, JSON.stringify(normalizedBuildings));
  }, [hydrated, localWatchedBuildingsQuery.data, localWatchedBuildingsQuery.error, remoteEnabled, watchedItems]);

  const buildingMap = useMemo(() => {
    const next = {};
    for (const building of feedBuildings) next[building.locationId] = building;
    return next;
  }, [feedBuildings]);

  const watchedSet = useMemo(() => new Set(watchedItems.map((item) => item.locationId)), [watchedItems]);
  const selectedListingSet = useMemo(() => new Set(selectedListingKeys), [selectedListingKeys]);
  const effectiveSelectedSet = useMemo(() => {
    if (!AUTO_TRACK_ALL_LISTINGS) return selectedListingSet;
    return new Set(Object.keys(changeState.listingHistory || {}));
  }, [changeState.listingHistory, selectedListingSet]);

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
  const searchLoading = normalizedSearchTerm.length >= 2 && searchQuery.fetchStatus === "fetching";
  const searchError = normalizedSearchTerm.length >= 2 && searchQuery.error
    ? getErrorMessage(searchQuery.error)
    : null;
  const watchedLoading = remoteEnabled
    ? remoteWatchedLoading
    : hydrated && watchedItems.length > 0 && localWatchedBuildingsQuery.fetchStatus === "fetching";

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
            buildingListingCount: getLoadedListingCount(building),
            trackedKey,
            isTracked: trackedKey ? (AUTO_TRACK_ALL_LISTINGS || effectiveSelectedSet.has(trackedKey)) : false,
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
      .sort(sortListings)
      // DEV ONLY: inject sample price drops for testing
      .map((l, i) => {
        const p = l.price || 3_000_000;
        if (i === 0) return { ...l, priceDelta: -500_000, previousPrice: p + 500_000, dropsCount: 1, totalChanges: 3, priceHistory: [
          { price: p + 800_000, at: "2026-03-01", type: "first_seen" },
          { price: p + 500_000, at: "2026-03-15", type: "price_drop" },
          { price: p + 500_000, at: "2026-03-28", type: "verified" },
          { price: p, at: "2026-04-10", type: "price_drop" },
        ]};
        if (i === 2) return { ...l, priceDelta: -200_000, previousPrice: p + 200_000, dropsCount: 1, totalChanges: 2, priceHistory: [
          { price: p + 200_000, at: "2026-03-10", type: "first_seen" },
          { price: p, at: "2026-04-05", type: "price_drop" },
        ]};
        if (i === 5) return { ...l, priceDelta: -1_000_000, previousPrice: p + 1_000_000, dropsCount: 2, totalChanges: 4, increasesCount: 1, priceHistory: [
          { price: p + 1_500_000, at: "2026-02-15", type: "first_seen" },
          { price: p + 1_000_000, at: "2026-03-01", type: "price_drop" },
          { price: p + 1_200_000, at: "2026-03-15", type: "price_increase" },
          { price: p, at: "2026-04-08", type: "price_drop" },
        ]};
        return l;
      });
  }, [changeState.listingHistory, effectiveSelectedSet, watchedBuildings]);

  const trackedListings = useMemo(
    () =>
      Object.values(changeState.listingHistory || {})
        .filter((entry) => watchedSet.has(entry.locationId) && effectiveSelectedSet.has(entry.key))
        .map((entry) => ({
          ...entry,
          price: entry.currentStatus === "active" ? entry.currentPrice : entry.lastKnownPrice,
          buildingKey: entry.locationId,
        }))
        .sort(sortTrackedListings),
    [changeState.listingHistory, effectiveSelectedSet, watchedSet],
  );

  const stats = useMemo(() => {
    const totalListings = watchedBuildings.reduce((sum, building) => sum + getLoadedListingCount(building), 0);
    return {
      watchedBuildingCount: watchedItems.length,
      watchedListingCount: totalListings,
      trackedListingCount: AUTO_TRACK_ALL_LISTINGS ? effectiveSelectedSet.size : selectedListingKeys.length,
      freshestListingAt: latestListings[0]?.verifiedAt || null,
      generatedAt: feed.generatedAt || null,
    };
  }, [effectiveSelectedSet.size, feed.generatedAt, latestListings, selectedListingKeys.length, watchedBuildings, watchedItems.length]);

  const alertSummary = useMemo(
    () => ({
      ...changeState.summary,
      watchedBuildingCount: watchedItems.length || changeState.summary.watchedBuildingCount,
      trackedListingCount: AUTO_TRACK_ALL_LISTINGS
        ? effectiveSelectedSet.size || changeState.summary.trackedListingCount
        : selectedListingKeys.length || changeState.summary.trackedListingCount,
    }),
    [changeState.summary, effectiveSelectedSet.size, selectedListingKeys.length, watchedItems.length],
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
      trackAllListings: AUTO_TRACK_ALL_LISTINGS,
    });

    setChangeState(nextChangeState);
    changeStateRef.current = nextChangeState;
    if (hydrated) safeSetItem(LISTING_ALERTS_STATE_KEY, JSON.stringify(nextChangeState));
  }

  async function persistWatchlistChange({ item, removing }) {
    if (!supabase || !sessionUserId || !item?.locationId) return;

    try {
      if (removing) {
        await supabase
          .from("listing_alerts_watchlists")
          .delete()
          .eq("user_id", sessionUserId)
          .eq("location_id", item.locationId);
        await supabase
          .from("listing_alerts_tracked_listings")
          .delete()
          .eq("user_id", sessionUserId)
          .eq("location_id", item.locationId);
      } else {
        const payload = {
          user_id: sessionUserId,
          location_id: item.locationId,
          building_name: item.buildingName,
          search_name: item.searchName,
          full_path: item.fullPath,
        };
        const { error } = await supabase
          .from("listing_alerts_watchlists")
          .upsert(payload, { onConflict: "user_id,location_id" });
        if (error) throw error;
      }
    } catch (error) {
      setWatchError(getErrorMessage(error));
    }
  }

  async function persistTrackedListingChange({ trackedKey, removing }) {
    if (!supabase || !sessionUserId || !trackedKey) return;
    const [locationId, ...listingIdParts] = trackedKey.split(":");
    const listingId = listingIdParts.join(":");
    if (!locationId || !listingId) return;

    try {
      if (removing) {
        const { error } = await supabase
          .from("listing_alerts_tracked_listings")
          .delete()
          .eq("user_id", sessionUserId)
          .eq("location_id", locationId)
          .eq("listing_id", listingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("listing_alerts_tracked_listings")
          .upsert({
            user_id: sessionUserId,
            location_id: locationId,
            listing_id: listingId,
          }, { onConflict: "user_id,location_id,listing_id" });
        if (error) throw error;
      }
    } catch (error) {
      setWatchError(getErrorMessage(error));
    }
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

    if (remoteEnabled) {
      void persistWatchlistChange({ item: normalized, removing });
    }

    if (!removing) return true;

    const nextSelectedListingKeys = selectedListingKeys.filter((key) => key.split(":")[0] !== normalized.locationId);
    setSelectedListingKeys(nextSelectedListingKeys);

    if (!nextWatchedItems.length) {
      const emptyState = createEmptyListingAlertsState();
      setChangeState(emptyState);
      changeStateRef.current = emptyState;
      safeRemoveItem(LISTING_ALERTS_STATE_KEY);
      safeRemoveItem(WATCHED_BUILDINGS_SNAPSHOT_KEY);
    } else {
      rebuildChangeState(nextSelectedListingKeys, nextWatchedItems);
    }

    return true;
  }

  function toggleListingSelection(listing) {
    if (AUTO_TRACK_ALL_LISTINGS) return;
    const trackedKey = createTrackedListingKey(listing?.locationId, listing?.id);
    if (!trackedKey) return;

    const nextSelectedListingKeys = selectedListingSet.has(trackedKey)
      ? selectedListingKeys.filter((key) => key !== trackedKey)
      : [...selectedListingKeys, trackedKey];

    setSelectedListingKeys(nextSelectedListingKeys);
    rebuildChangeState(nextSelectedListingKeys);
    if (remoteEnabled) {
      void persistTrackedListingChange({ trackedKey, removing: selectedListingSet.has(trackedKey) });
    }
  }

  async function refresh() {
    if (!watchedItems.length || watchedLoading) return;
    if (!remoteEnabled) {
      setWatchError(null);
      setRefreshNonce((current) => current + 1);
      return;
    }

    setRemoteWatchedLoading(true);
    setWatchError(null);

    try {
      const { error } = await supabase.functions.invoke("listing-alerts-sync");
      if (error) throw error;
      await loadRemoteState({ showLoading: false });
    } catch (error) {
      setWatchError(getErrorMessage(error));
    } finally {
      setRemoteWatchedLoading(false);
    }
  }

  return {
    alertSummary,
    autoTracking: AUTO_TRACK_ALL_LISTINGS,
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
