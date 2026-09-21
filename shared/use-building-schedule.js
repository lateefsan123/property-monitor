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
  const value = draft?.userId === userId ? draft.value : query.data || emptySchedule();
  const mutation = useMutation({
    mutationFn: (next) => services.save(userId, next),
    onSuccess: (saved) => { cache.setQueryData(key, saved); setDraft(null); },
  });
  function change(patch) {
    mutation.reset();
    setDraft({ userId, value: { ...value, ...patch } });
  }
  function toggleBuilding(day, name) {
    const items = value.days[day];
    const exists = items.some(item => scheduleBuildingKey(item) === scheduleBuildingKey(name));
    change({ days: { ...value.days, [day]: exists ? items.filter(item => scheduleBuildingKey(item) !== scheduleBuildingKey(name)) : [...items, name] } });
  }
  return {
    value, change, toggleBuilding, buildings: spreadsheetBuildings?.buildings || buildings.data || [],
    loading: query.isPending || (spreadsheetBuildings ? spreadsheetBuildings.loading : buildings.isPending),
    loadError: query.error || (spreadsheetBuildings ? spreadsheetBuildings.error : buildings.error),
    error: mutation.error, saving: mutation.isPending,
    saved: mutation.isSuccess, dirty: draft?.userId === userId,
    retry: () => { void query.refetch(); if (spreadsheetBuildings) spreadsheetBuildings.retry(); else void buildings.refetch(); },
    save: () => mutation.mutate(value),
  };
}
