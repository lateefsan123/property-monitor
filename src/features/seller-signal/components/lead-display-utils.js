export function formatLeadBedroom(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/studio/i.test(raw)) return "Studio";
  if (/^\d+$/.test(raw)) return `${raw}BR`;
  return raw;
}

export function extractUnitFromBuilding(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = raw.match(/^(?:\[.*?\]\s*)?(?:Apartment|Unit|Villa)\s+([A-Za-z0-9-]+)/i);
  return match?.[1] || null;
}

export function formatLeadUnit(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^unit\b/i.test(raw)) return raw;
  return `Unit ${raw}`;
}
