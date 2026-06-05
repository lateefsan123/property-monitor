export function getSearchOptionLabel(option) {
  return option?.buildingName || option?.searchName || "Unknown";
}

export function getSearchOptionMeta(option) {
  const fullPath = String(option?.fullPath || "").trim();
  if (!fullPath) return null;

  const label = getSearchOptionLabel(option).toLowerCase();
  const parts = fullPath.split("|").map((part) => part.trim()).filter(Boolean);
  const remaining = parts.filter((part, index) => index !== 0 || part.toLowerCase() !== label);

  return (remaining.length ? remaining : parts).join(", ");
}
