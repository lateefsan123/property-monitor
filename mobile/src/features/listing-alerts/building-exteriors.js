import exteriors from '../../data/building-exteriors.json' with { type: 'json' };

// Preserve tower numbers/letters. Never use substring or nearest-name matches.
const key = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const byName = new Map();
for (const exterior of exteriors) {
  for (const name of [exterior.name, ...exterior.aliases]) {
    byName.set(key(name), exterior);
  }
}

export function getBuildingExterior(building) {
  return byName.get(key(typeof building === 'string' ? building : building?.buildingName)) || null;
}

export function selectBuildingResults({ watchedBuildings = [], searchResults = [], selectedBuilding, searching, watchingOnly }) {
  if (!searching && !selectedBuilding) return watchedBuildings;
  const results = selectedBuilding ? [selectedBuilding] : searchResults;
  if (!watchingOnly) return results;
  const watchedIds = new Set(watchedBuildings.map((building) => String(building.locationId)));
  return results.filter((building) => watchedIds.has(String(building.locationId)));
}
