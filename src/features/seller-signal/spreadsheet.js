import { UserFacingError } from "../../../shared/user-facing-errors.js";
import { COLUMN_ALIASES, HEADER_SCAN_LIMIT } from "./constants.js";

export function normalizeToken(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function inferColumn(headers, aliases) {
  const normalizedHeaders = headers.map((header) => ({ header, normalized: normalizeToken(header) }));
  const normalizedAliases = aliases.map((alias) => normalizeToken(alias));

  for (const alias of normalizedAliases) {
    const exactMatch = normalizedHeaders.find((header) => header.normalized === alias);
    if (exactMatch) return exactMatch.header;
  }

  return null;
}

export function inferMapping(headers) {
  return {
    name: inferColumn(headers, COLUMN_ALIASES.name),
    building: inferColumn(headers, COLUMN_ALIASES.building),
    bedroom: inferColumn(headers, COLUMN_ALIASES.bedroom),
    status: inferColumn(headers, COLUMN_ALIASES.status),
    lastContact: inferColumn(headers, COLUMN_ALIASES.lastContact),
    phone: inferColumn(headers, COLUMN_ALIASES.phone),
    unit: inferColumn(headers, COLUMN_ALIASES.unit),
  };
}

function mappingScore(mapping) {
  let score = 0;
  if (mapping.name) score += 2;
  if (mapping.building) score += 3;
  if (mapping.bedroom) score += 1;
  if (mapping.status) score += 3;
  if (mapping.lastContact) score += 3;
  if (mapping.phone) score += 2;
  if (mapping.unit) score += 1;
  return score;
}

export function parseCsvText(text) {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (inQuotes) {
      if (character === "\"") {
        if (source[index + 1] === "\"") {
          field += "\"";
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === "\"") {
      inQuotes = true;
      continue;
    }

    if (character === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (character !== "\r") field += character;
  }

  if (inQuotes) throw new UserFacingError("The CSV has an unfinished quoted cell. Export it again and retry.");
  row.push(field);
  if (row.some((value) => String(value).trim() !== "")) rows.push(row);
  return rows;
}

function makeHeadersUnique(headers) {
  const used = new Set();
  return headers.map((header) => {
    const base = String(header || "").trim() || "Column";
    let unique = base;
    let count = 1;
    while (used.has(unique) || unique === "__row") unique = `${base} (${++count})`;
    used.add(unique);
    return unique;
  });
}

export function rowsToObjects(rows, { headerRowIndex: selectedHeader } = {}) {
  if (!rows.length) return { headers: [], records: [] };

  let headerRowIndex = 0;
  let bestScore = -1;

  for (let rowIndex = 0; rowIndex < Math.min(rows.length - 1, HEADER_SCAN_LIMIT); rowIndex += 1) {
    const candidateHeaders = rows[rowIndex].map((value, index) => {
      const label = String(value || "").trim();
      return label || `Column ${index + 1}`;
    });

    const candidateScore = mappingScore(inferMapping(candidateHeaders));
    if (candidateScore > bestScore) {
      bestScore = candidateScore;
      headerRowIndex = rowIndex;
    }
  }

  if (Number.isInteger(selectedHeader) && selectedHeader >= 0 && selectedHeader < rows.length) headerRowIndex = selectedHeader;

  const headers = makeHeadersUnique(
    Array.from({ length: rows.reduce((width, row) => Math.max(width, row.length), 0) }, (_, index) => {
      const label = String(rows[headerRowIndex][index] ?? "").trim();
      return label || `Column ${index + 1}`;
    }),
  );

  const records = rows
    .slice(headerRowIndex + 1)
    .map((row, dataIndex) => {
      if (!row.some(value => String(value ?? "").trim())) return null;
      const record = Object.create(null);
      record.__row = headerRowIndex + 2 + dataIndex;
      headers.forEach((header, columnIndex) => {
        record[header] = String(row[columnIndex] ?? "").trim();
      });
      return record;
    }).filter(Boolean);

  const named = withFullName(headers, records);
  return { ...withVillaLocation(named.headers, named.records), headerRowIndex };
}

function withFullName(headers, records) {
  if (inferMapping(headers).name) return { headers, records };
  const first = headers.find(header => ['firstname', 'givenname'].includes(normalizeToken(header)));
  const last = headers.find(header => ['lastname', 'surname', 'familyname'].includes(normalizeToken(header)));
  if (!first || !last) return { headers, records };
  const label = 'First + last name';
  for (const record of records) record[label] = [record[first], record[last]].filter(Boolean).join(' ');
  return { headers: [...headers, label], records };
}

// Villa sheets often split the location into "Community" and "Sub Community"
// columns. With no building or project column, they're combined as
// "Arabian Ranches 3 - Raya" so the seller matches their community's sales.
export const VILLA_LOCATION_HEADER = "Community / Sub-community";
function withVillaLocation(headers, records) {
  const find = (names) => headers.find((header) => names.includes(normalizeToken(header)));
  const community = find(["community", "mastercommunity"]);
  const sub = find(["subcommunity", "subcommunityname"]);
  const hasBuilding = headers.some((header) => ["buildingname", "towername", "building", "tower", "project"].includes(normalizeToken(header)));
  if (!community || !sub || hasBuilding || headers.includes(VILLA_LOCATION_HEADER)) return { headers, records };
  for (const record of records) {
    record[VILLA_LOCATION_HEADER] = [record[community], record[sub]].filter(Boolean).join(" - ");
  }
  return { headers: [...headers, VILLA_LOCATION_HEADER], records };
}

export function buildGoogleCsvUrl(rawUrl) {
  const input = String(rawUrl || "").trim();
  if (!input) return null;

  const normalized = input.startsWith("http")
    ? input
    : input.startsWith("docs.google.com")
      ? `https://${input}`
      : input;

  const sheetIdMatch = normalized.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = normalized.match(/[?&#]gid=([0-9]+)/);
  if (sheetIdMatch) {
    if (gidMatch) {
      return `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=csv&gid=${gidMatch[1]}`;
    }
    return `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=csv`;
  }

  if (/^[a-zA-Z0-9-_]{20,}$/.test(normalized)) {
    return `https://docs.google.com/spreadsheets/d/${normalized}/export?format=csv`;
  }

  return null;
}
