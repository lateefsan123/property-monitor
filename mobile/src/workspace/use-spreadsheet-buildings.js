import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLeadSources, fetchUserLeads } from '../features/seller-signal/services';
import { leadSourcesQueryKey } from '../features/seller-signal/useSellerSignalPage';
import { leadsQueryKey } from '../features/seller-signal/useHomeLeadSummary';
import { spreadsheetBuildingNames } from '../../../src/features/schedule/spreadsheet-buildings';

export function useSpreadsheetBuildings(userId) {
  const [selection, setSelection] = useState(null);
  const sources = useQuery({ queryKey: leadSourcesQueryKey(userId), queryFn: () => fetchLeadSources(userId), enabled: Boolean(userId), staleTime: 60_000 });
  const leads = useQuery({ queryKey: leadsQueryKey(userId), queryFn: () => fetchUserLeads(userId), enabled: Boolean(userId), staleTime: 120_000 });
  const sourceId = selection?.userId === userId && sources.data?.some(source => source.id === selection.id) ? selection.id : '';
  const buildings = useMemo(() => spreadsheetBuildingNames(leads.data?.leads, sourceId), [leads.data, sourceId]);
  return {
    buildings, sourceId, setSourceId: id => setSelection({ userId, id }),
    sources: (sources.data || []).map(source => ({ id: source.id, label: source.label?.trim() || source.building_name?.trim() || `Spreadsheet ${Number(source.sort_order ?? 0) + 1}` })),
    loading: sources.isPending || leads.isPending,
    error: sources.error || leads.error,
    retry: () => { void sources.refetch(); void leads.refetch(); },
  };
}
