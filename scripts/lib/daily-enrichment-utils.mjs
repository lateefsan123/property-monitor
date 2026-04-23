import {
  cleanBuildingName,
  inferColumn,
  normalizeToken,
} from "./bayut-common.mjs";

export function inferMapping(headers, columnAliases) {
  return {
    name: inferColumn(headers, columnAliases.name),
    building: inferColumn(headers, columnAliases.building),
    bedroom: inferColumn(headers, columnAliases.bedroom),
    status: inferColumn(headers, columnAliases.status),
    lastContact: inferColumn(headers, columnAliases.lastContact),
  };
}

export function mappingScore(mapping) {
  let score = 0;
  if (mapping.name) score += 2;
  if (mapping.building) score += 3;
  if (mapping.bedroom) score += 1;
  if (mapping.status) score += 3;
  if (mapping.lastContact) score += 3;
  return score;
}

export function scoreHeaders(headers, columnAliases) {
  return mappingScore(inferMapping(headers, columnAliases));
}

export function parseBedroom(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return { label: "unit", beds: null };

  const lower = raw.toLowerCase();
  if (lower.includes("studio")) return { label: "studio", beds: [0] };

  const match = lower.match(/(\d+)/);
  if (match) {
    const bedCount = Number(match[1]);
    if (Number.isFinite(bedCount) && bedCount >= 0 && bedCount <= 8) {
      return { label: `${bedCount}-bed`, beds: [bedCount] };
    }
  }

  return { label: raw, beds: null };
}

export function buildLeadGroups(records, mapping) {
  const leads = records
    .map((record, index) => {
      const bedroom = mapping.bedroom ? record[mapping.bedroom] : "";
      return {
        id: `${record.__row || index + 2}-${index}`,
        name: mapping.name ? record[mapping.name] : "",
        building: mapping.building ? record[mapping.building] : "",
        bedroom,
        bedroomInfo: parseBedroom(bedroom),
      };
    })
    .filter((lead) => lead.building);

  const groupsByKey = {};
  for (const lead of leads) {
    const cleanedBuilding = cleanBuildingName(lead.building);
    const buildingKey = normalizeToken(cleanedBuilding);
    if (!buildingKey) continue;

    const beds = Array.isArray(lead.bedroomInfo.beds) && lead.bedroomInfo.beds.length
      ? [...lead.bedroomInfo.beds].sort((left, right) => left - right)
      : null;
    const bedKey = beds ? beds.join(",") : "any";
    const groupKey = `${buildingKey}::${bedKey}`;

    if (!groupsByKey[groupKey]) {
      groupsByKey[groupKey] = {
        groupKey,
        buildingKey,
        searchName: cleanedBuilding,
        beds,
        leadCount: 0,
      };
    }

    groupsByKey[groupKey].leadCount += 1;
  }

  return {
    leads,
    groups: Object.values(groupsByKey),
  };
}

function parseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const parsed = Number(value.replace(/[,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractPrice(transaction) {
  for (const value of [
    transaction?.price,
    transaction?.amount,
    transaction?.sale_price,
    transaction?.sold_price,
    transaction?.transaction_value,
    transaction?.value,
  ]) {
    const parsed = parseNumber(value);
    if (parsed && parsed > 0) return parsed;
  }
  return null;
}

function extractArea(transaction) {
  for (const value of [
    transaction?.area,
    transaction?.built_up_area,
    transaction?.size,
    transaction?.sqft,
    transaction?.area_sqft,
    transaction?.property?.builtup_area?.sqft,
  ]) {
    const parsed = parseNumber(value);
    if (parsed && parsed > 0) return parsed;
  }
  return null;
}

export function summarizeTransactions(transactions) {
  const prices = [];
  const psfValues = [];

  for (const transaction of transactions) {
    const price = extractPrice(transaction);
    if (!price) continue;

    prices.push(price);
    const area = extractArea(transaction);
    if (area) psfValues.push(price / area);
  }

  if (!prices.length) {
    return {
      count: transactions.length,
      avg: null,
      min: null,
      max: null,
      psf: null,
    };
  }

  return {
    count: transactions.length,
    avg: prices.reduce((sum, price) => sum + price, 0) / prices.length,
    min: Math.min(...prices),
    max: Math.max(...prices),
    psf: psfValues.length ? psfValues.reduce((sum, value) => sum + value, 0) / psfValues.length : null,
  };
}
