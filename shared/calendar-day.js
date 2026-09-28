export function calendarDay(now = Date.now()) {
  const day = new Date(now + 4 * 3600000).toISOString().slice(0, 10);
  const start = `${day}T00:00:00+04:00`;
  return { day, start, end: new Date(Date.parse(start) + 86400000).toISOString() };
}

export function calendarTime(event) {
  if (event.allDay) return 'All day';
  const start = /(?:Z|[+-]\d\d:\d\d)$/.test(event.start) ? event.start : `${event.start}Z`;
  const date = new Date(start);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit' }) : '';
}
