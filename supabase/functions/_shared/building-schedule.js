export const SCHEDULE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const scheduleBuildingKey = (name) => String(name || "").trim().replace(/\s+/g, " ").toLowerCase();
export function emptySchedule() {
  return { enabled: false, fill_unused: false, days: Object.fromEntries(SCHEDULE_DAYS.map(day => [day, []])) };
}
export function normalizeSchedule(value) {
  const days = {};
  for (const day of SCHEDULE_DAYS) {
    const items = value?.days?.[day] ?? [];
    if (!Array.isArray(items) || items.some(name => typeof name !== "string" || !name.trim() || name.length > 300)) throw new Error("Invalid schedule buildings.");
    days[day] = [...new Map(items.map(name => [scheduleBuildingKey(name), name.trim()])).values()];
    if (days[day].length > 100) throw new Error("Choose at most 100 buildings per day.");
  }
  return { enabled: value?.enabled === true, fill_unused: value?.fill_unused === true, days };
}
export function dubaiScheduleDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Dubai" }).format(date);
}
export const scheduleCountKey = (lead) => JSON.stringify([String(lead.user_id), scheduleBuildingKey(lead.building)]);

// Re-evaluate the least-served building after each yield. Only successful sends
// (or explicit dry-run projections) increment counts, never ineligible leads.
export function createScheduleQueue(leads, schedules, counts = new Map(), date = new Date()) {
  const weekday = dubaiScheduleDay(date);
  const users = new Map();
  for (const lead of leads) {
    const user = String(lead.user_id);
    if (!users.has(user)) users.set(user, []);
    users.get(user).push(lead);
  }
  function* perUser(user, items) {
    const schedule = schedules.get(user);
    if (!schedule?.enabled) { yield* items; return; }
    const selected = new Set(schedule.days[weekday].map(scheduleBuildingKey));
    if (!selected.size) return; // An empty day is always an off day, even with fallback.
    const groups = new Map();
    const fallback = [];
    for (const lead of items) {
      const key = scheduleBuildingKey(lead.building);
      if (!selected.has(key)) { if (schedule.fill_unused) fallback.push(lead); continue; }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(lead);
    }
    while (groups.size) {
      let next;
      for (const group of groups.values()) {
        if (!next || (counts.get(scheduleCountKey(group[0])) || 0) < (counts.get(scheduleCountKey(next[0])) || 0)) next = group;
      }
      const lead = next.shift();
      if (!next.length) groups.delete(scheduleBuildingKey(lead.building));
      yield lead;
    }
    yield* fallback;
  }
  return {
    recordSend(lead) { const key = scheduleCountKey(lead); counts.set(key, (counts.get(key) || 0) + 1); },
    *[Symbol.iterator]() {
      if (![...schedules.values()].some(schedule => schedule.enabled)) { yield* leads; return; }
      const iterators = [...users].map(([user, items]) => perUser(user, items));
      while (iterators.length) {
        for (let i = 0; i < iterators.length;) {
          const result = iterators[i].next();
          if (result.done) iterators.splice(i, 1);
          else { i++; yield result.value; }
        }
      }
    },
  };
}

export async function loadScheduleQueue(client, leads, date = new Date(), countLeads = leads) {
  const ids = [...new Set(countLeads.map(lead => String(lead.user_id)))];
  const schedules = new Map();
  const counts = new Map();
  const leadMap = new Map(countLeads.map(lead => [String(lead.id), lead]));
  const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const start = new Date(`${dayKey}T00:00:00+04:00`);
  const end = new Date(start.getTime() + 86400000);
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const { data, error } = await client.from("seller_signal_building_schedules").select("user_id, enabled, fill_unused, days").in("user_id", batch);
    if (error) throw new Error(`Could not load building schedules: ${error.message}`);
    for (const row of data || []) schedules.set(String(row.user_id), normalizeSchedule(row));
    const enabled = batch.filter(id => schedules.get(id)?.enabled);
    if (!enabled.length) continue;
    for (let offset = 0; ; offset += 1000) {
      const result = await client.from("whatsapp_messages").select("id, lead_id, user_id")
        .in("user_id", enabled).eq("direction", "outbound").eq("send_source", "auto")
        .in("status", ["queued", "sending", "sent", "delivered", "read"])
        .gte("created_at", start.toISOString()).lt("created_at", end.toISOString())
        .order("id", { ascending: true }).range(offset, offset + 999);
      if (result.error) throw new Error(`Could not load schedule allocation: ${result.error.message}`);
      for (const row of result.data || []) {
        const lead = leadMap.get(String(row.lead_id));
        if (lead && String(lead.user_id) === String(row.user_id)) {
          const key = scheduleCountKey(lead);
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      }
      if ((result.data || []).length < 1000) break;
    }
  }
  return createScheduleQueue(leads, schedules, counts, date);
}
