export function dubaiDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function shiftDate(key, days) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function activityRange(preset = 'today', today = dubaiDateKey()) {
  const endDate = preset === 'yesterday' ? shiftDate(today, -1) : today;
  return { startDate: shiftDate(endDate, preset === 'week' ? -6 : preset === 'month' ? -29 : 0), endDate };
}
export function validateActivityRange(range, today = dubaiDateKey()) {
  const valid = key => /^\d{4}-\d{2}-\d{2}$/.test(key || '') && Number.isFinite(Date.parse(`${key}T00:00:00Z`)) && new Date(`${key}T00:00:00Z`).toISOString().slice(0, 10) === key;
  if (!valid(range.startDate) || !valid(range.endDate)) throw new Error('Enter valid dates as YYYY-MM-DD.');
  if (range.startDate > range.endDate) throw new Error('End date must be on or after start date.');
  if (range.endDate > today) throw new Error('Choose today or an earlier date.');
  return { start: new Date(`${range.startDate}T00:00:00+04:00`).toISOString(), end: new Date(`${shiftDate(range.endDate, 1)}T00:00:00+04:00`).toISOString() };
}
export function activityRangeLabel(range, today = dubaiDateKey()) {
  if (range.startDate === today && range.endDate === today) return 'Today';
  const format = key => new Date(`${key}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return range.startDate === range.endDate ? format(range.startDate) : `${format(range.startDate)} – ${format(range.endDate)}`;
}
