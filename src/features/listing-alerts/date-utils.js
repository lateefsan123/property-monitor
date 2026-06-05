export function daysBetween(start, end) {
  const startTime = start ? new Date(String(start).replace(" ", "T")).getTime() : NaN;
  const endTime = end ? new Date(String(end).replace(" ", "T")).getTime() : NaN;
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null;
  return Math.max(0, Math.round((endTime - startTime) / (1000 * 60 * 60 * 24)));
}
