import { emptySchedule, normalizeSchedule, scheduleBuildingKey } from "../supabase/functions/_shared/building-schedule.js";

export function createBuildingScheduleServices(client) {
  return {
    async load(userId) {
      if (!userId) throw new Error("Sign in to manage your schedule.");
      const { data, error } = await client.from("seller_signal_building_schedules")
        .select("enabled, fill_unused, days").eq("user_id", userId).maybeSingle();
      if (error) throw new Error(["42P01", "PGRST205"].includes(error.code)
        ? "Scheduling is waiting for the backend update. Your existing automations are unchanged."
        : "Could not load your schedule. Please retry.");
      return data ? normalizeSchedule(data) : emptySchedule();
    },
    async buildings(userId) {
      if (!userId) throw new Error("Sign in to choose buildings.");
      const names = new Map();
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await client.from("leads").select("id, building")
          .eq("user_id", userId).not("building", "is", null)
          .order("id", { ascending: true }).range(offset, offset + 999);
        if (error) throw new Error("Could not load your buildings. Please retry.");
        for (const row of data || []) {
          const name = row.building?.trim();
          if (name) names.set(scheduleBuildingKey(name), name);
        }
        if ((data || []).length < 1000) break;
      }
      return [...names.values()].sort((a, b) => a.localeCompare(b));
    },
    async save(userId, value) {
      if (!userId) throw new Error("Sign in to save your schedule.");
      const schedule = normalizeSchedule(value);
      const { error } = await client.from("seller_signal_building_schedules")
        .upsert({ user_id: userId, ...schedule }, { onConflict: "user_id" });
      if (error) throw new Error("Could not save your schedule. Your edits are still here; please retry.");
      return schedule;
    },
  };
}
