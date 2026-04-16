import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../supabase";
import { leadsQueryKey } from "./useHomeLeadSummary";
import { leadSourcesQueryKey } from "./useSellerSignalPage";

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
        () => queryClient.invalidateQueries({ queryKey: leadsQueryKey(userId) }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sent_leads", filter },
        () => queryClient.invalidateQueries({ queryKey: leadsQueryKey(userId) }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_sources", filter },
        () => queryClient.invalidateQueries({ queryKey: leadSourcesQueryKey(userId) }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);
}
