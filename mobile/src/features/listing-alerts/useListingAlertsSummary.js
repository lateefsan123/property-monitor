import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import {
  createEmptyListingAlertsState,
  getWatchedBuildingCount,
  LISTING_ALERTS_STATE_KEY,
  parseListingAlertsState,
  WATCHED_BUILDINGS_KEY,
} from "./change-detection";

const EMPTY_SUMMARY = createEmptyListingAlertsState().summary;

async function fetchListingAlertsSummary() {
  const [[, rawWatchlist], [, rawState]] = await AsyncStorage.multiGet([
    WATCHED_BUILDINGS_KEY,
    LISTING_ALERTS_STATE_KEY,
  ]);

  const watchedBuildingCount = getWatchedBuildingCount(rawWatchlist);
  const alertState = parseListingAlertsState(rawState);

  return {
    ...alertState.summary,
    watchedBuildingCount: watchedBuildingCount || alertState.summary.watchedBuildingCount,
  };
}

export function useListingAlertsSummary() {
  const query = useQuery({
    queryKey: ["listing-alerts", "summary"],
    queryFn: fetchListingAlertsSummary,
  });

  return {
    ...EMPTY_SUMMARY,
    ...(query.data ?? {}),
    loading: query.isPending,
  };
}
