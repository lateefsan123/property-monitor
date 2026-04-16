import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import listingAlertsFeed from "../../data/listing-alerts-feed.json";
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
    listingCount: Number.isFinite(building?.listingCount) ? building.listingCount : listings.length,
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

const FEED_BUILDINGS = (listingAlertsFeed.buildings || [])
  .map((building) => ({ ...building, locationId: toLocationId(building.locationId) }))
  .filter((building) => building.locationId)
  .sort(sortBuildings);

function normalizeWatchedItem(item) {
  if (!item) return null;

  if (typeof item === "string") {
    const feedMatch = FEED_BUILDINGS.find((building) => building.key === item || building.locationId === item);
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

function uniqueWatchedItems(items) {
  const seen = new Set();
  const deduped = [];

  for (const item of items) {
    const normalized = normalizeWatchedItem(item);
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
  const [watchedItems, setWatchedItems] = useState([]);
  const [selectedListingKeys, setSelectedListingKeys] = useState([]);
  const [watchedBuildingsRemote, setWatchedBuildingsRemote] = useState([]);
  const [changeState, setChangeState] = useState(() => createEmptyListingAlertsState());
  const [sessionUserId, setSessionUserId] = useState(null);
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
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const remoteEnabled = Boolean(supabase && sessionUserId);
  const normalizedSearchTerm = deferredSearchTerm.trim();

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

    if (showLoading) setWatchedLoading(true);
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
        }))
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

      await AsyncStorage.multiSet([
        [WATCHED_BUILDINGS_KEY, JSON.stringify(nextWatchedItems)],
        [SELECTED_LISTINGS_KEY, JSON.stringify(nextSelectedKeys)],
        [LISTING_ALERTS_STATE_KEY, JSON.stringify(nextState)],
      ]);

      const snapshotListingCount = snapshotBuildings.reduce((sum, building) => sum + (building.listings?.length || 0), 0);
      const needsLiveFallback = nextWatchedItems.length && (
        !snapshotBuildings.length || snapshotListingCount === 0
      );
      if (needsLiveFallback) {
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
          await AsyncStorage.setItem(LISTING_ALERTS_STATE_KEY, JSON.stringify(nextFallbackState));
        } catch {
          // ignore live fallback failure
        }
      }
    } catch (error) {
      setWatchError(getErrorMessage(error));
    } finally {
      if (showLoading) setWatchedLoading(false);
      setHydrated(true);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function loadLocalState() {
      try {
        const [[, rawWatchlist], [, rawAlertState], [, rawSelectedListings], [, rawWatchedSnapshot]] = await AsyncStorage.multiGet([
          WATCHED_BUILDINGS_KEY,
          LISTING_ALERTS_STATE_KEY,
          SELECTED_LISTINGS_KEY,
          WATCHED_BUILDINGS_SNAPSHOT_KEY,
        ]);
        if (!isActive) return;

        let initialWatchedItems = [];
        if (rawWatchlist) {
          const parsedWatchlist = JSON.parse(rawWatchlist);
          if (Array.isArray(parsedWatchlist)) {
            initialWatchedItems = uniqueWatchedItems(parsedWatchlist);
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
            void AsyncStorage.removeItem(WATCHED_BUILDINGS_SNAPSHOT_KEY);
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
      void loadLocalState();
    }

    return () => {
      isActive = false;
    };
  }, [remoteEnabled, sessionUserId]);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(WATCHED_BUILDINGS_KEY, JSON.stringify(watchedItems));
  }, [hydrated, watchedItems]);

  useEffect(() => {
    changeStateRef.current = changeState;
  }, [changeState]);

  useEffect(() => {
    selectedListingKeysRef.current = selectedListingKeys;
  }, [selectedListingKeys]);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(SELECTED_LISTINGS_KEY, JSON.stringify(selectedListingKeys));
  }, [hydrated, selectedListingKeys]);

  useEffect(() => {
    if (normalizedSearchTerm.length < 2) {
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
        const results = await searchBayutAlertLocations(normalizedSearchTerm);
        if (!isActive) return;
        setSearchResults(results.map(normalizeWatchedItem).filter(Boolean));
      } catch (error) {
        if (!isActive) return;
        setSearchResults([]);
        setSearchError(getErrorMessage(error));
      } finally {
        if (isActive) setSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [normalizedSearchTerm]);

  useEffect(() => {
    if (!hydrated) return undefined;
    if (remoteEnabled) return undefined;
    if (!watchedItems.length) {
      const emptyState = createEmptyListingAlertsState();
      setWatchedBuildingsRemote([]);
      setWatchedLoading(false);
      setWatchError(null);
      setChangeState(emptyState);
      changeStateRef.current = emptyState;
      void AsyncStorage.multiRemove([LISTING_ALERTS_STATE_KEY, WATCHED_BUILDINGS_SNAPSHOT_KEY]);
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
          trackAllListings: AUTO_TRACK_ALL_LISTINGS,
        });

        setWatchedBuildingsRemote(normalizedBuildings);
        setChangeState(nextChangeState);
        changeStateRef.current = nextChangeState;
        await AsyncStorage.multiSet([
          [LISTING_ALERTS_STATE_KEY, JSON.stringify(nextChangeState)],
          [WATCHED_BUILDINGS_SNAPSHOT_KEY, JSON.stringify(normalizedBuildings)],
        ]);
      } catch (error) {
        if (!isActive) return;
        setWatchError(getErrorMessage(error));
      } finally {
        if (isActive) setWatchedLoading(false);
      }
    }

    void loadWatchedBuildings();

    return () => {
      isActive = false;
    };
  }, [hydrated, refreshNonce, watchedItems, remoteEnabled]);

  const buildingMap = useMemo(() => {
    const next = {};
    for (const building of FEED_BUILDINGS) next[building.locationId] = building;
    return next;
  }, []);

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
    () => FEED_BUILDINGS.filter((building) => !watchedSet.has(building.locationId) && matchesSearch(building, searchValue)).slice(0, DEFAULT_SUGGESTION_COUNT),
    [searchValue, watchedSet],
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
      .sort(sortListings);
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
      generatedAt: listingAlertsFeed.generatedAt || null,
    };
  }, [effectiveSelectedSet.size, latestListings, selectedListingKeys.length, watchedBuildings, watchedItems.length]);

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
    if (hydrated) void AsyncStorage.setItem(LISTING_ALERTS_STATE_KEY, JSON.stringify(nextChangeState));
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
    const normalized = normalizeWatchedItem(item);
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
      void AsyncStorage.multiRemove([LISTING_ALERTS_STATE_KEY, WATCHED_BUILDINGS_SNAPSHOT_KEY]);
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

    setWatchedLoading(true);
    setWatchError(null);

    try {
      const { error } = await supabase.functions.invoke("listing-alerts-sync");
      if (error) throw error;
      await loadRemoteState({ showLoading: false });
    } catch (error) {
      setWatchError(getErrorMessage(error));
    } finally {
      setWatchedLoading(false);
    }
  }

  return {
    alertSummary,
    autoTracking: AUTO_TRACK_ALL_LISTINGS,
    changeItems: changeState.changeItems,
    generatedAt: listingAlertsFeed.generatedAt || null,
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
