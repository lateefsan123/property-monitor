import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { splitLeadsBySentStatus } from "./selectors";
import { fetchUserLeads } from "./services";

export function leadsQueryKey(userId) {
  return ["seller-signal", "leads", userId];
}

export function useHomeLeadSummary(userId) {
  const query = useQuery({
    queryKey: leadsQueryKey(userId),
    queryFn: () => fetchUserLeads(userId),
    enabled: Boolean(userId),
  });

  const leads = query.data?.leads ?? [];
  const sentLeads = query.data?.sentMap ?? {};

  const { activeLeads, doneLeads } = useMemo(
    () => splitLeadsBySentStatus(leads, sentLeads),
    [leads, sentLeads],
  );

  const dueCount = useMemo(
    () => activeLeads.filter((lead) => lead.isDue).length,
    [activeLeads],
  );

  return {
    activeCount: activeLeads.length,
    doneCount: doneLeads.length,
    dueCount,
    error: query.error?.message ?? null,
    hasLeads: leads.length > 0,
    loading: query.isPending && Boolean(userId),
  };
}
