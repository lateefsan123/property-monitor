import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSellerSources, formatSourceLabel } from "../seller-signal/page-helpers";
import { fetchUserLeads } from "../seller-signal/lead-record-services";
import { sellerLeadsQueryKey, sellerSourcesQueryKey } from "../seller-signal/queryKeys";
import { spreadsheetBuildingNames } from "./spreadsheet-buildings";

export function useSpreadsheetBuildings(userId) {
  const [selectedId, setSelectedId] = useState("");
  const sources = useQuery({ queryKey: sellerSourcesQueryKey(userId), queryFn: () => fetchSellerSources(userId), enabled: Boolean(userId), staleTime: 60_000 });
  const leads = useQuery({ queryKey: sellerLeadsQueryKey(userId), queryFn: () => fetchUserLeads(userId), enabled: Boolean(userId), staleTime: 120_000 });
  const sourceId = sources.data?.some(source => source.id === selectedId) ? selectedId : "";
  const buildings = useMemo(() => spreadsheetBuildingNames(leads.data?.leads, sourceId), [leads.data, sourceId]);
  return {
    buildings, sourceId, setSourceId: setSelectedId,
    sources: (sources.data || []).map(source => ({ id: source.id, label: formatSourceLabel(source) })),
    loading: sources.isPending || leads.isPending,
    error: sources.error || leads.error,
    retry: () => { void sources.refetch(); void leads.refetch(); },
  };
}
