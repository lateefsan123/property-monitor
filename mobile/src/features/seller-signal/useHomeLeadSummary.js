import { useEffect, useMemo, useState } from "react";
import { splitLeadsBySentStatus } from "./selectors";
import { fetchLeadInsights, fetchUserLeads } from "./services";

export function useHomeLeadSummary(userId) {
  const [leads, setLeads] = useState([]);
  const [sentLeads, setSentLeads] = useState({});
  const [insights, setInsights] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isActive = true;

    async function loadSummary() {
      if (!userId) {
        setLeads([]);
        setSentLeads({});
        setInsights({});
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { leads: nextLeads, sentMap } = await fetchUserLeads(userId);
        if (!isActive) return;

        setLeads(nextLeads);
        setSentLeads(sentMap);
        setInsights({});
        setLoading(false);

        const leadsWithBuildings = nextLeads.filter((lead) => lead.building);
        if (!leadsWithBuildings.length) return;

        try {
          const { updates } = await fetchLeadInsights(leadsWithBuildings);
          if (!isActive) return;
          setInsights(updates);
        } catch {
          // The home metric can still render the follow-up queue without enrichment.
        }
      } catch (loadError) {
        if (!isActive) return;

        setLeads([]);
        setSentLeads({});
        setInsights({});
        setError(loadError.message);
        setLoading(false);
      }
    }

    void loadSummary();

    return () => {
      isActive = false;
    };
  }, [userId]);

  const { activeLeads, doneLeads } = useMemo(
    () => splitLeadsBySentStatus(leads, sentLeads, insights),
    [insights, leads, sentLeads],
  );

  const dueCount = useMemo(
    () => activeLeads.filter((lead) => lead.isDue).length,
    [activeLeads],
  );

  return {
    activeCount: activeLeads.length,
    doneCount: doneLeads.length,
    dueCount,
    error,
    hasLeads: leads.length > 0,
    loading,
  };
}
