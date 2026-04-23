import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../supabase";
import { searchBayutAlertLocations } from "./api";
import {
  buildListingAlertsState,
  createTrackedListingKey,
  createEmptyListingAlertsState,
  LISTING_ALERTS_STATE_KEY,
  parseSelectedListingKeys,
  SELECTED_LISTINGS_KEY,
  WATCHED_BUILDINGS_SNAPSHOT_KEY,
  toLocationId,
} from "./change-detection";
import {
  AUTO_TRACK_ALL_LISTINGS,
  DEFAULT_SUGGESTION_COUNT,
  EMPTY_FEED,
  EMPTY_LIST,
  fetchListingAlertsFeed,
  getErrorMessage,
  getLoadedListingCount,
  matchesSearch,
  MAX_WATCHED_BUILDINGS,
  normalizeWatchedItem,
  safeRemoveItem,
  safeSetItem,
  snapshotToCurrentBuilding,
  sortBuildings,
  sortListings,
  sortTrackedListings,
  toFallbackWatchedBuilding,
  SEARCH_DEBOUNCE_MS,
} from "./alert-utils";
import { useListingAlertsState } from "./useListingAlertsState";

export function useListingAlerts() {
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearchTerm = deferredSearchTerm.trim();

  const feedQuery = useQuery({
    queryKey: ["listing-alerts-feed"],
    queryFn: fetchListingAlertsFeed,
    placeholderData: EMPTY_FEED,
    staleTime: 5 * 60 * 1000,
  });
  const feed = feedQuery.data || EMPTY_FEED;
  const feedBuildings = feed.buildings || EMPTY_LIST;

  const {
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
  } = useListingAlertsState(feedBuildings);

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
    if (!sessionUserId || !item?.locationId) return;

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
    if (!sessionUserId || !trackedKey) return;
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

    setWatchError(null);
    try {
      const { error } = await supabase.functions.invoke("listing-alerts-sync");
      if (error) throw error;
      await loadRemoteState({ showLoading: false });
    } catch (error) {
      setWatchError(getErrorMessage(error));
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
