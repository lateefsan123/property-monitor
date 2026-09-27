const token = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function locationLabel(location) {
  const usable = value => typeof value === 'string' && value.trim() && !/^(0|unknown)$/i.test(value.trim());
  const direct = [location?.name, location?.title, location?.name_l1, location?.name_l2, location?.location_name].find(usable);
  const parts = Array.isArray(location?.location) ? location.location : String(location?.full_name || location?.path || '').split(/\s*(?:\||>|,|\/)\s*/);
  return (direct || parts.filter(usable).at(-1) || '').trim();
}

// An unrelated result must never win just because its label has a similar length.
// Require one exact named location. Duplicate names in different areas are ambiguous.
export function matchBayutLocation(locations, name) {
  const target = token(name);
  if (!target) return null;
  const matches = new Map();
  for (const location of locations || []) {
    if (token(locationLabel(location)) !== target) continue;
    const id = location?.id || location?.externalID || location?.location_id;
    if (id) matches.set(String(id), location);
  }
  return matches.size === 1 ? [...matches.values()][0] : null;
}
