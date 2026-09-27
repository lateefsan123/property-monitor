export function orderSellerList(leads, { pins = [], favorites = [], favoritesOnly = false, sort = "priority" } = {}) {
  const pinned = new Set(pins.map(String));
  const starred = new Set(favorites.map(String));
  return leads.filter(lead => !favoritesOnly || starred.has(String(lead.id))).sort((a, b) =>
    Number(pinned.has(String(b.id))) - Number(pinned.has(String(a.id))) ||
    (sort === "alpha" ? String(a.name || "").localeCompare(String(b.name || "")) : 0)
  );
}
