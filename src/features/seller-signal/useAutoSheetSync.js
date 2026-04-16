import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchLeadSources, replaceUserLeadsFromSheet } from "./services";

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (DEBUG — was 1 hour)
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

  console.log(`[SHEET-SYNC ${new Date().toLocaleTimeString()}] Starting sync for ${linked.length} sheet(s)`);

  let imported = 0;
  for (const source of linked) {
    try {
      const result = await replaceUserLeadsFromSheet({ userId, source, rawSheetUrl: source.sheet_url });
      console.log(`[SHEET-SYNC ${new Date().toLocaleTimeString()}] Synced "${source.label || source.id}" — ${result?.count || 0} new leads`);
      imported += 1;
    } catch (err) {
      console.warn(`[SHEET-SYNC ${new Date().toLocaleTimeString()}] Failed "${source.label || source.id}":`, err.message);
    }
  }
  console.log(`[SHEET-SYNC ${new Date().toLocaleTimeString()}] Sync complete — ${imported} sheet(s) processed`);
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
