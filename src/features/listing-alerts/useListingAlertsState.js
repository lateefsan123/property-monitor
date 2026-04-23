import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

export function useListingAlertsState(feedBuildings) {
  const [watchedItems, setWatchedItems] = useState([]);
  const [selectedListingKeys, setSelectedListingKeys] = useState([]);
  const [watchedBuildingsRemote, setWatchedBuildingsRemote] = useState([]);
  const [changeState, setChangeState] = useState(() => createEmptyListingAlertsState());
  const [sessionUserId, setSessionUserId] = useState(null);
  const [remoteWatchedLoading, setRemoteWatchedLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [watchError, setWatchError] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const changeStateRef = useRef(createEmptyListingAlertsState());
  const selectedListingKeysRef = useRef([]);

  const remoteEnabled = Boolean(supabase && sessionUserId);

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

  const loadRemoteState = useCallback(async ({ showLoading = true } = {}) => {
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
  }, [feedBuildings, sessionUserId]);

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

    loadLocalState();

    if (remoteEnabled) {
      void loadRemoteState({ showLoading: false });
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
