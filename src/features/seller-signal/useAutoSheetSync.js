import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchLeadSources, replaceUserLeadsFromSheet } from "./services";

const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const LAST_SYNC_KEY = "seller-signal:last-sheet-sync";

function getLastSyncTime() {
  const raw = localStorage.getItem(LAST_SYNC_KEY);
  return raw ? Number(raw) : 0;
}

function setLastSyncTime() {
  localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
}

async function syncAllSheets(userId) {
  const sources = await fetchLeadSources(userId);
  const linked = sources.filter((s) => s.sheet_url);
  if (!linked.length) return 0;

  let imported = 0;
  for (const source of linked) {
    try {
      await replaceUserLeadsFromSheet({ userId, source, rawSheetUrl: source.sheet_url });
      imported += 1;
    } catch {
      // skip failed sheets silently
    }
  }
  return imported;
}

export function useAutoSheetSync(userId) {
  const queryClient = useQueryClient();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    async function runSync() {
      if (syncingRef.current) return;
      const elapsed = Date.now() - getLastSyncTime();
      if (elapsed < SYNC_INTERVAL_MS) return;

      syncingRef.current = true;
      try {
        const count = await syncAllSheets(userId);
        setLastSyncTime();
        if (count > 0) {
          queryClient.invalidateQueries({ queryKey: ["seller-signal", "leads", userId] });
        }
      } finally {
        syncingRef.current = false;
      }
    }

    // Run on mount (respects the 1-hour cooldown)
    void runSync();

    // Check periodically
    const id = setInterval(runSync, 5 * 60 * 1000); // check every 5 min
    return () => clearInterval(id);
  }, [userId, queryClient]);
}
