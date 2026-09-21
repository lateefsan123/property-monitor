import { createBuildingScheduleServices } from "./building-schedule-services.js";

export function buildingScheduleOptions(client, userId) {
  const services = createBuildingScheduleServices(client);
  const common = { enabled: Boolean(userId), staleTime: 60_000, gcTime: 30 * 60_000 };
  return {
    schedule: { ...common, queryKey: ["building-schedule", userId], queryFn: () => services.load(userId) },
    buildings: { ...common, queryKey: ["schedule-buildings", userId], queryFn: () => services.buildings(userId) },
  };
}
