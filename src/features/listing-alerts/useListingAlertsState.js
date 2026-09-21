import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listingStateOptions } from "./listing-state-query";
import { supabase } from "../../supabase";
import {
  buildListingAlertsState,
  createEmptyListingAlertsState,
  createTrackedListingKey,
  LISTING_ALERTS_STATE_KEY,
  parseListingAlertsState,
  parseSelectedListingKeys,
  SELECTED_LISTINGS_KEY,
  WATCHED_BUILDINGS_KEY,
  WATCHED_BUILDINGS_SNAPSHOT_KEY,
  toLocationId,
} from "./change-detection";
import {
  AUTO_TRACK_ALL_LISTINGS,
  fetchNormalizedWatchedBuildings,
  filterSelectedKeysForWatched,
  getErrorMessage,
  normalizeWatchedItem,
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
  snapshotToRemoteBuilding,
  sortBuildings,
  uniqueWatchedItems,
} from "./alert-utils";
import { fetchBayutWatchedBuildings } from "./api";

function getStoredSyncErrorMessage(summary) {
  const fetchErrorCount = Number.isFinite(summary?.fetchErrorCount) ? summary.fetchErrorCount : 0;
  if (!fetchErrorCount) return null;

  const firstError = summary?.lastFetchErrorMessage || "Bayut live listing fetch failed.";
  if (firstError.toLowerCase().includes("not subscribed")) {
    return "Bayut live listing sync is blocked: the RapidAPI key is not subscribed to uae-real-estate2.";
  }

  return `Bayut live listing sync failed for ${fetchErrorCount} ${fetchErrorCount === 1 ? "building" : "buildings"}: ${firstError}`;
}

function cachedListingState(cache, userId, feedBuildings) {
  const payload = cache.getQueryData(["listing-alerts-state", userId]);
  if (!payload) return null;
  const row = payload.stateRow;
  const state = parseListingAlertsState(row ? {
    summary: row.summary || {}, snapshot: row.snapshot || {},
    changeItems: row.change_items || [], listingHistory: row.listing_history || {},
  } : null);
  return {
    state,
    watched: payload.watchlistRows.map(row => normalizeWatchedItem({
      locationId: row.location_id, buildingName: row.building_name,
      searchName: row.search_name, fullPath: row.full_path,
    }, feedBuildings)).filter(Boolean),
    selected: parseSelectedListingKeys(payload.trackedRows.map(row => createTrackedListingKey(row.location_id, row.listing_id)).filter(Boolean)),
    buildings: Object.values(state.snapshot || {}).map(snapshotToRemoteBuilding).sort(sortBuildings),
  };
}

export function useListingAlertsState(feedBuildings, sessionUserId) {
  const queryClient = useQueryClient();
  const [initial] = useState(() => cachedListingState(queryClient, sessionUserId, feedBuildings));
  const [watchedItems, setWatchedItems] = useState(initial?.watched || []);
  const [selectedListingKeys, setSelectedListingKeys] = useState(initial?.selected || []);
  const [watchedBuildingsRemote, setWatchedBuildingsRemote] = useState(initial?.buildings || []);
  const [changeState, setChangeState] = useState(() => initial?.state || createEmptyListingAlertsState());
  const [remoteWatchedLoading, setRemoteWatchedLoading] = useState(false);
  const [hydrated, setHydrated] = useState(Boolean(initial));
  const [watchError, setWatchError] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const changeStateRef = useRef(initial?.state || createEmptyListingAlertsState());
  const selectedListingKeysRef = useRef(initial?.selected || []);

  const remoteEnabled = Boolean(supabase && sessionUserId);

  const loadRemoteState = useCallback(async ({ showLoading = true, useCache = false } = {}) => {
    if (!supabase || !sessionUserId) return;

    if (showLoading) setRemoteWatchedLoading(true);
    setWatchError(null);

    try {
      const options = listingStateOptions(supabase, sessionUserId);
      const { watchlistRows, trackedRows, stateRow } = await queryClient.fetchQuery({
        ...options, staleTime: useCache ? options.staleTime : 0,
      });

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
      setWatchError(getStoredSyncErrorMessage(nextState.summary));

      const snapshotBuildings = Object.values(nextState.snapshot || {}).map(snapshotToRemoteBuilding).sort(sortBuildings);
      setWatchedBuildingsRemote(snapshotBuildings);

      safeSetItem(WATCHED_BUILDINGS_KEY, JSON.stringify(nextWatchedItems));
      safeSetItem(SELECTED_LISTINGS_KEY, JSON.stringify(nextSelectedKeys));
      safeSetItem(LISTING_ALERTS_STATE_KEY, JSON.stringify(nextState));

      const snapshotLocationIds = new Set(snapshotBuildings.map((building) => String(building.locationId)));
      const missingItems = nextWatchedItems.filter((item) => !snapshotLocationIds.has(String(item.locationId)));
      const needsLiveFetch = missingItems.length > 0 || (nextWatchedItems.length > 0 && snapshotBuildings.length === 0);
      if (needsLiveFetch) {
        try {
          const itemsToFetch = missingItems.length ? missingItems : nextWatchedItems;
          const buildings = await fetchBayutWatchedBuildings(itemsToFetch);
          const normalizedBuildings = buildings.map((building) => ({ ...building, locationId: toLocationId(building.locationId) })).sort(sortBuildings);
          const mergedBuildings = [...snapshotBuildings.filter((building) => !normalizedBuildings.some((next) => String(next.locationId) === String(building.locationId))), ...normalizedBuildings].sort(sortBuildings);
          const nextFallbackState = buildListingAlertsState({
            currentBuildings: mergedBuildings,
            previousState: nextState,
            watchedItems: nextWatchedItems,
            selectedListingKeys: nextSelectedKeys,
            trackAllListings: AUTO_TRACK_ALL_LISTINGS,
          });

          setWatchedBuildingsRemote(mergedBuildings);
          setChangeState(nextFallbackState);
          changeStateRef.current = nextFallbackState;
          safeSetItem(LISTING_ALERTS_STATE_KEY, JSON.stringify(nextFallbackState));
        } catch {
          /* ignore live fallback failure */
        }
      }
    } catch (error) {
      setWatchError(getErrorMessage(error));
    } finally {
      if (showLoading) setRemoteWatchedLoading(false);
      setHydrated(true);
    }
  }, [feedBuildings, sessionUserId, queryClient]);

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
      void loadRemoteState({ showLoading: false, useCache: true });
    } else {
      loadLocalState();
    }

    return () => {
      isActive = false;
    };
  }, [feedBuildings, loadRemoteState, remoteEnabled]);

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

  const watchedLoading = useMemo(
    () => (remoteEnabled
      ? remoteWatchedLoading
      : hydrated && watchedItems.length > 0 && localWatchedBuildingsQuery.fetchStatus === "fetching"),
    [hydrated, localWatchedBuildingsQuery.fetchStatus, remoteEnabled, remoteWatchedLoading, watchedItems.length],
  );

  return {
    changeState,
    changeStateRef,
    hydrated,
    loadRemoteState,
    remoteEnabled,
    selectedListingKeys,
    selectedListingKeysRef,
    sessionUserId,
    setChangeState,
    setRefreshNonce,
    setSelectedListingKeys,
    setWatchError,
    setWatchedBuildingsRemote,
    setWatchedItems,
    watchError,
    watchedBuildingsRemote,
    watchedItems,
    watchedLoading,
  };
}
