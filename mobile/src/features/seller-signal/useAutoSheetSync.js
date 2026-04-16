import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchLeadSources, replaceUserLeadsFromSheet } from "./services";
import { leadsQueryKey } from "./useHomeLeadSummary";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const LAST_SYNC_KEY = "seller-signal:last-sheet-sync";

async function getLastSyncTime() {
  const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
  return raw ? Number(raw) : 0;
}

async function setLastSyncTime() {
  await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
}

async function syncAllSheets(userId) {
  const sources = await fetchLeadSources(userId);
  const linked = sources.filter((source) => source.sheet_url);
  if (!linked.length) return 0;

  let imported = 0;
  for (const source of linked) {
    try {
      await replaceUserLeadsFromSheet({ userId, source, rawSheetUrl: source.sheet_url });
      imported += 1;
    } catch (error) {
      console.warn(`[sheet-sync] Failed "${source.label || source.id}":`, error.message);
    }
  }
  return imported;
}

export function useAutoSheetSync(userId) {
  const queryClient = useQueryClient();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!userId) return undefined;

    let cancelled = false;

    async function runSync() {
      if (syncingRef.current) return;
      const elapsed = Date.now() - (await getLastSyncTime());
      if (elapsed < SYNC_INTERVAL_MS) return;

      syncingRef.current = true;
      try {
        const count = await syncAllSheets(userId);
        await setLastSyncTime();
        if (!cancelled && count > 0) {
          queryClient.invalidateQueries({ queryKey: leadsQueryKey(userId) });
        }
      } finally {
        syncingRef.current = false;
      }
    }

    void runSync();
    const id = setInterval(runSync, SYNC_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [userId, queryClient]);
}
