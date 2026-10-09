// Each building name's match, worked out by the same JavaScript the Sellers
// page has always used, saved per account in seller_building_index so the
// server-side seller list (seller_list_page) can filter, search and spot
// duplicates without re-implementing building matching in SQL.
import { createLeadBuildingResolver } from "./lead-data-quality";
import { getBuildingKeyVariants, parseBuildingAddressValue } from "./building-utils";
import { normalizeToken } from "./spreadsheet";

// Bump when building matching changes (building-utils.js, building-registry.js,
// lead-data-quality.js): every saved match is then worked out again.
export const BUILDING_INDEX_VERSION = 1;

function hash(text) {
  // Two 32-bit FNV-1a passes with different seeds: short, stable, no crypto API needed.
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    a = Math.imul(a ^ code, 0x01000193) >>> 0;
    b = Math.imul(b ^ code, 0x5bd1e995) >>> 0;
  }
  return `${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}`;
}

// Changes whenever the account's aliases or the known building list change.
export function buildingIndexSignature(buildingAliases = [], cachedBuildings = []) {
  const aliases = (buildingAliases || [])
    .map((alias) => [String(alias.aliasName || ""), String(alias.canonicalName || ""), Boolean(alias.automatic), Boolean(alias.isGlobal)])
    .sort((left, right) => left.join("\u0001").localeCompare(right.join("\u0001")));
  const buildings = (cachedBuildings || [])
    .map((building) => [String(building.key || ""), String(building.search_name || ""), String(building.location_name || "")])
    .sort((left, right) => left[0].localeCompare(right[0]));
  return `v${BUILDING_INDEX_VERSION}-${hash(JSON.stringify([aliases, buildings]))}`;
}

export function createBuildingIndexer(buildingAliases = [], cachedBuildings = []) {
  const resolve = createLeadBuildingResolver(buildingAliases, cachedBuildings);
  return (rawBuilding) => {
    const raw = String(rawBuilding ?? "");
    const match = resolve(raw) || {};
    const resolved = match.canonicalName || raw || "";
    return {
      raw_building: raw,
      match_status: String(match.status || "unmatched"),
      match,
      resolved_building: resolved,
      canonical_token: normalizeToken(match.canonicalName || raw),
      address_unit: parseBuildingAddressValue(raw).unit || "",
      key_variants: getBuildingKeyVariants(resolved).slice(0, 64),
    };
  };
}
