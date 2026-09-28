// Initials avatar shared by the sellers table and the seller drawer so a
// seller keeps the same colour in both places.
const AVATAR_COLOURS = ["#5b3fd1", "#1d4ed8", "#0f766e", "#b45309", "#be185d", "#4d7c0f", "#7c3aed", "#0369a1"];

export function sellerInitials(name) {
  const parts = String(name || "").replace(/^(mr|mrs|ms|dr)\.?\s+/i, "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function sellerAvatarColour(seed) {
  let hash = 0;
  for (const character of String(seed)) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
}

export function sellerStatusTone(id) {
  return { prospect: "blue", market_appraisal: "amber", for_sale_available: "green" }[id] || "grey";
}
