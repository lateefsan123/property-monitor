import { COLUMN_ALIASES, HEADER_SCAN_LIMIT } from "./constants";

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

  for (const alias of normalizedAliases.filter((candidate) => candidate.length >= 5)) {
    const partialMatch = normalizedHeaders.find((header) => header.normalized.includes(alias));
    if (partialMatch) return partialMatch.header;
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

  row.push(field);
  if (row.some((value) => String(value).trim() !== "")) rows.push(row);
  return rows;
}

function makeHeadersUnique(headers) {
  const counts = {};
  return headers.map((header) => {
    const base = String(header || "").trim() || "Column";
    counts[base] = (counts[base] || 0) + 1;
    return counts[base] === 1 ? base : `${base} (${counts[base]})`;
  });
}

export function rowsToObjects(rows) {
  if (!rows.length) return { headers: [], records: [] };

  let headerRowIndex = 0;
  let bestScore = -1;

  for (let rowIndex = 0; rowIndex < Math.min(rows.length, HEADER_SCAN_LIMIT); rowIndex += 1) {
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

  const headers = makeHeadersUnique(
    rows[headerRowIndex].map((value, index) => {
      const label = String(value || "").trim();
      return label || `Column ${index + 1}`;
    }),
  );

  const records = rows
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((value) => String(value || "").trim() !== ""))
    .map((row, dataIndex) => {
      const record = { __row: headerRowIndex + 2 + dataIndex };
      headers.forEach((header, columnIndex) => {
        record[header] = String(row[columnIndex] ?? "").trim();
      });
      return record;
    });

  return { headers, records };
}

export function buildGoogleCsvUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || "").trim());
    const sheetIdMatch = parsed.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) return null;
    const gid = parsed.searchParams.get("gid") || "0";
    return `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=csv&gid=${gid}`;
  } catch {
    return null;
  }
}
