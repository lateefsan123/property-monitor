import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  createEmptyListingAlertsState,
  getWatchedBuildingCount,
  LISTING_ALERTS_STATE_KEY,
  parseListingAlertsState,
  WATCHED_BUILDINGS_KEY,
} from "./change-detection";

export function useListingAlertsSummary() {
  const [summary, setSummary] = useState(() => ({
    ...createEmptyListingAlertsState().summary,
    loading: true,
  }));

  useEffect(() => {
    let isActive = true;

    async function loadSummary() {
      try {
        const [[, rawWatchlist], [, rawState]] = await AsyncStorage.multiGet([WATCHED_BUILDINGS_KEY, LISTING_ALERTS_STATE_KEY]);
        if (!isActive) return;

        const watchedBuildingCount = getWatchedBuildingCount(rawWatchlist);
        const alertState = parseListingAlertsState(rawState);

        setSummary({
          ...alertState.summary,
          watchedBuildingCount: watchedBuildingCount || alertState.summary.watchedBuildingCount,
          loading: false,
        });
      } catch {
        if (!isActive) return;
        setSummary((current) => ({ ...current, loading: false }));
      }
    }

    void loadSummary();

    return () => {
      isActive = false;
    };
  }, []);

  return summary;
}
