import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBuildingScheduleServices } from "./building-schedule-services.js";
import { buildingScheduleOptions } from "./building-schedule-queries.js";
import { emptySchedule, scheduleBuildingKey } from "../supabase/functions/_shared/building-schedule.js";

export function useBuildingSchedule(client, userId, spreadsheetBuildings) {
  const services = createBuildingScheduleServices(client);
  const cache = useQueryClient();
  const options = buildingScheduleOptions(client, userId);
  const key = options.schedule.queryKey;
  const query = useQuery(options.schedule);
  const buildings = useQuery({ ...options.buildings, enabled: options.buildings.enabled && !spreadsheetBuildings });
  const [draft, setDraft] = useState(null);
  const value = { ...(query.data || emptySchedule()), ...(draft?.userId === userId ? draft.patch : {}) };
  const mutation = useMutation({
    mutationFn: (next) => services.save(userId, next),
    onSuccess: (saved) => { cache.setQueryData(key, saved); setDraft(null); },
  });
  function change(patch) {
    mutation.reset();
    setDraft(previous => {
      const edits = previous?.userId === userId ? previous.patch : {};
      const current = { ...(query.data || emptySchedule()), ...edits };
      return { userId, patch: { ...edits, ...(typeof patch === 'function' ? patch(current) : patch) } };
    });
  }
  function toggleBuilding(day, name) {
    change(current => {
      const items = current.days[day];
      const exists = items.some(item => scheduleBuildingKey(item) === scheduleBuildingKey(name));
      return { days: { ...current.days, [day]: exists ? items.filter(item => scheduleBuildingKey(item) !== scheduleBuildingKey(name)) : [...items, name] } };
    });
  }
  function removeBuilding(name) {
    change(current => ({ days: Object.fromEntries(Object.entries(current.days).map(([day, items]) =>
      [day, items.filter(item => scheduleBuildingKey(item) !== scheduleBuildingKey(name))])) }));
  }
  return {
    value, change, toggleBuilding, removeBuilding, buildings: spreadsheetBuildings?.buildings || buildings.data || [],
    loading: query.isPending || (spreadsheetBuildings ? spreadsheetBuildings.loading : buildings.isPending),
    loadError: query.error || (spreadsheetBuildings ? spreadsheetBuildings.error : buildings.error),
    error: mutation.error, saving: mutation.isPending,
    saved: mutation.isSuccess, dirty: draft?.userId === userId,
    retry: () => { void query.refetch(); if (spreadsheetBuildings) spreadsheetBuildings.retry(); else void buildings.refetch(); },
    save: () => mutation.mutate(value),
  };
}
