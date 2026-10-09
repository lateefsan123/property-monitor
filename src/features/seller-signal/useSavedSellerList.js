import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { readSavedUserLeads } from "./lead-record-services";
import { sellerLeadsQueryKey } from "./queryKeys";

// Shows the seller list saved on this device straight away, marked as old so
// the normal load still runs and replaces it. Skipped once real data is in.
export function useSavedSellerList(userId) {
  const client = useQueryClient();
  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    readSavedUserLeads(userId).then((saved) => {
      const key = sellerLeadsQueryKey(userId);
      if (!active || !saved || client.getQueryData(key)) return;
      const { savedAt, ...data } = saved;
      client.setQueryData(key, data, { updatedAt: savedAt });
    }).catch(() => {});
    return () => { active = false; };
  }, [client, userId]);
}
