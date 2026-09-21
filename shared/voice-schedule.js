import { createBuildingScheduleServices } from './building-schedule-services.js';
import { SCHEDULE_DAYS, emptySchedule, normalizeSchedule, scheduleBuildingKey, dubaiScheduleDay } from '../supabase/functions/_shared/building-schedule.js';

export const SCHEDULE_ACTIONS = ['add', 'remove', 'replace', 'clear_day', 'enable', 'disable', 'fallback_on', 'fallback_off'];
export const SCHEDULE_INSTRUCTIONS = 'For recurring building schedules use weekly_schedule to read the week and the current Dubai day. Use schedule_buildings to resolve exact buildings from this account; ask when ambiguous. Use prepare_schedule for day assignments, clear_day, weekly-mode changes or fallback. Add keeps existing buildings; replace only when explicitly requested. Empty days never send. Disabling weekly mode restores account-wide automation, it does NOT pause sending; use prepare_automation to pause follow-ups/reports. Never enable weekly mode as a side effect of editing a day. Show the proposal and wait for the visible Confirm change button. Spoken agreement is not execution. These edits repeat every week, not one-off dates, and never send immediately.';

// No model-facing write function: workspace.confirm owns the single-use approval.
export function createVoiceSchedule({ supabase, userId }) {
  const services = createBuildingScheduleServices(supabase);
  async function queryResult(query, signal) {
    if (signal?.aborted) throw new Error('Conversation ended.');
    const response = await (signal ? query.abortSignal(signal) : query);
    if (response.error) {
      if (['42P01', 'PGRST205'].includes(response.error.code)) throw new Error('Scheduling is waiting for the backend update.');
      throw new Error(response.error.message);
    }
    if (signal?.aborted) throw new Error('Conversation ended.');
    return response.data;
  }
  async function load(signal) {
    const row = await queryResult(supabase.from('seller_signal_building_schedules')
      .select('enabled,fill_unused,days').eq('user_id', userId).maybeSingle(), signal);
    return { exists: Boolean(row), value: row ? normalizeSchedule(row) : emptySchedule() };
  }
  async function read(name, args, signal) {
    if (name === 'schedule_buildings') {
      const offset = Number(args.offset);
      if (!Number.isInteger(offset) || offset < 0 || offset > 100000) throw new Error('Invalid page.');
      const buildings = (await services.buildings(userId)).filter(item => scheduleBuildingKey(item).includes(scheduleBuildingKey(args.query)));
      if (signal?.aborted) throw new Error('Conversation ended.');
      return { kind: 'schedule-buildings', title: 'Your buildings', total: buildings.length, offset,
        nextOffset: offset + 20 < buildings.length ? offset + 20 : null,
        items: buildings.slice(offset, offset + 20).map(name => ({ name })) };
    }
    const { value } = await load(signal);
    const now = new Date();
    return { kind: 'weekly-schedule', title: 'Your weekly schedule', enabled: value.enabled, fill_unused: value.fill_unused,
      today: dubaiScheduleDay(now), tomorrow: dubaiScheduleDay(new Date(now.getTime() + 86400000)),
      date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now),
      timeZone: 'Asia/Dubai',
      note: value.enabled ? 'Repeats weekly in Dubai time. Eligibility and sending limits still apply; this is not a promise of sends.' : 'Weekly schedule is off; these are saved assignments only. Existing account-wide automation settings apply.',
      items: [
        { name: 'Weekly schedule', content: value.enabled ? 'On' : 'Off — account-wide automation settings apply' },
        { name: 'Fill unused slots', content: value.fill_unused ? 'On' : 'Off' },
        ...SCHEDULE_DAYS.map(day => ({ name: day, content: value.days[day].join(', ') || 'No sends when weekly schedule is on' })),
      ] };
  }
  async function prepare(args, signal) {
    if (!SCHEDULE_ACTIONS.includes(args.action)) throw new Error('Invalid schedule action.');
    const dayAction = ['add', 'remove', 'replace', 'clear_day'].includes(args.action);
    if (dayAction ? !SCHEDULE_DAYS.includes(args.day) : args.day !== '') throw new Error('Choose a valid weekday, or no day for a preference change.');
    let requested;
    try { requested = JSON.parse(args.buildings_json); } catch { throw new Error('Use a JSON array of building names.'); }
    if (!Array.isArray(requested) || requested.length > 100 || requested.some(name => typeof name !== 'string' || !name.trim() || name.length > 300)) throw new Error('Invalid buildings.');
    const needsBuildings = ['add', 'remove', 'replace'].includes(args.action);
    if (needsBuildings ? !requested.length : requested.length) throw new Error('Provide buildings only for add, remove or replace. Use clear_day to empty a day.');
    const before = await load(signal);
    const next = normalizeSchedule(before.value);
    if (needsBuildings) {
      const available = args.action === 'remove' ? next.days[args.day] : await services.buildings(userId);
      const canonical = new Map(available.map(name => [scheduleBuildingKey(name), name]));
      requested = requested.map(name => {
        const found = canonical.get(scheduleBuildingKey(name));
        if (!found) throw new Error('Building not found. Use schedule_buildings and resolve the exact building before changing the schedule.');
        return found;
      });
      const selected = new Set(requested.map(scheduleBuildingKey));
      if (args.action === 'add') next.days[args.day] = [...next.days[args.day], ...requested];
      if (args.action === 'replace') next.days[args.day] = requested;
      if (args.action === 'remove') next.days[args.day] = next.days[args.day].filter(name => !selected.has(scheduleBuildingKey(name)));
    }
    if (args.action === 'clear_day') next.days[args.day] = [];
    if (args.action === 'enable' || args.action === 'disable') next.enabled = args.action === 'enable';
    if (args.action === 'fallback_on' || args.action === 'fallback_off') next.fill_unused = args.action === 'fallback_on';
    const normalized = normalizeSchedule(next);
    if (signal?.aborted) throw new Error('Conversation ended.');
    if (JSON.stringify(normalized) === JSON.stringify(before.value)) return { unchanged: true, message: 'Your schedule already matches that request.' };
    const detail = dayAction
      ? `${args.day}\nBefore: ${before.value.days[args.day].join(', ') || 'No sends'}\nAfter: ${normalized.days[args.day].join(', ') || 'No sends'}\n\nOther days are unchanged.`
      : args.action.startsWith('fallback_') ? `Fill unused slots from other buildings: ${before.value.fill_unused ? 'On' : 'Off'} → ${normalized.fill_unused ? 'On' : 'Off'}. Empty days remain off.`
        : `Weekly schedule: ${before.value.enabled ? 'On' : 'Off'} → ${normalized.enabled ? 'On' : 'Off'}.`;
    return { change: { kind: 'schedule', before, next: normalized }, preview: {
      subject: dayAction ? `Update ${args.day}’s schedule?` : 'Update schedule preference?',
      body: `${detail}\n\n${normalized.enabled ? 'Repeats weekly in Dubai time. Selected buildings share eligible sends evenly.' : 'Weekly mode is off. Account-wide automation settings apply; this does not pause sending.'}\nExisting limits still apply. No immediate send.`,
    } };
  }
  async function confirm(change) {
    // Compare all fields atomically. A concurrent edit must produce a new preview,
    // not silently replace another device's changes. First save uses INSERT only.
    let query;
    if (change.before.exists) {
      query = supabase.from('seller_signal_building_schedules').update(change.next).eq('user_id', userId)
        .eq('enabled', change.before.value.enabled).eq('fill_unused', change.before.value.fill_unused)
        .eq('days', JSON.stringify(change.before.value.days));
    } else query = supabase.from('seller_signal_building_schedules').insert({ user_id: userId, ...change.next });
    const response = await query.select('enabled,fill_unused,days').maybeSingle();
    if (response.error?.code === '23505' || (!response.error && !response.data)) throw new Error('The schedule changed. Ask for a fresh preview.');
    if (response.error) throw new Error('Could not save the schedule. Check its current state before trying again.');
    if (JSON.stringify(normalizeSchedule(response.data)) !== JSON.stringify(change.next)) throw new Error('Could not verify the saved schedule. Check its current state.');
    return { message: `Schedule saved. ${change.next.enabled ? 'It repeats weekly until you change it.' : 'Weekly mode is off; existing account-wide automation settings apply.'} No immediate send was requested.` };
  }
  return { read, prepare, confirm };
}
