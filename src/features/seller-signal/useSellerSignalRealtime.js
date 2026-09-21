import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../supabase";
import { sellerLeadsQueryKey, sellerSourcesQueryKey } from "./queryKeys";

export function useSellerSignalRealtime(userId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return undefined;

    const filter = `user_id=eq.${userId}`;

    const channel = supabase
      .channel(`seller-signal:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads", filter },
        () => {
          void queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) });
          void queryClient.invalidateQueries({ queryKey: ["schedule-buildings", userId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sent_leads", filter },
        () => queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_sources", filter },
        () => {
          void queryClient.invalidateQueries({ queryKey: sellerSourcesQueryKey(userId) });
          void queryClient.invalidateQueries({ queryKey: ["schedule-buildings", userId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);
}
