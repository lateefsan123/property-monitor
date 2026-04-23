import fs from "node:fs/promises";

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function toInt(raw, fallback) {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

export function formatDate(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export async function readDotEnv(file = ".env") {
  try {
    const raw = await fs.readFile(file, "utf8");
    const entries = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        return [line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim()];
      });
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

export async function readApiKeyFromDotEnv(file = ".env") {
  const dotEnv = await readDotEnv(file);
  return dotEnv.RAPIDAPI_KEY || dotEnv.VITE_RAPIDAPI_KEY || null;
}

export function normalizeToken(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function inferColumn(headers, aliases) {
  const normalizedHeaders = headers.map((header) => ({ header, normalized: normalizeToken(header) }));
  const normalizedAliases = aliases.map((alias) => normalizeToken(alias));

  for (const alias of normalizedAliases) {
    const exactMatch = normalizedHeaders.find((header) => header.normalized === alias);
    if (exactMatch) return exactMatch.header;
  }

  for (const alias of normalizedAliases.filter((value) => value.length >= 5)) {
    const partialMatch = normalizedHeaders.find((header) => header.normalized.includes(alias));
    if (partialMatch) return partialMatch.header;
  }

  return null;
}

export function parseCsvText(text) {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inQuotes) {
      if (char === "\"") {
        if (source[index + 1] === "\"") {
          field += "\"";
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (char !== "\r") field += char;
  }

  row.push(field);
  if (row.some((value) => String(value).trim() !== "")) rows.push(row);
  return rows;
}

export function makeHeadersUnique(headers) {
  const counts = {};
  return headers.map((header) => {
    const base = String(header || "").trim() || "Column";
    counts[base] = (counts[base] || 0) + 1;
    return counts[base] === 1 ? base : `${base} (${counts[base]})`;
  });
}

function toHeaderLabel(value, index) {
  const label = String(value || "").trim();
  return label || `Column ${index + 1}`;
}

export function rowsToObjects(rows, options = {}) {
  const { getHeaderScore } = options;
  if (!rows.length) return { headers: [], records: [], headerRowIndex: 0 };

  const scanLimit = Math.min(rows.length, 40);
  let headerRowIndex = 0;
  let bestScore = -1;

  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex += 1) {
    const candidateHeaders = rows[rowIndex].map((value, index) => toHeaderLabel(value, index));
    const score = typeof getHeaderScore === "function" ? getHeaderScore(candidateHeaders) : 0;
    if (score > bestScore) {
      bestScore = score;
      headerRowIndex = rowIndex;
    }
  }

  const rawHeaders = rows[headerRowIndex].map((value, index) => toHeaderLabel(value, index));
  const headers = makeHeadersUnique(rawHeaders);
  const records = rows
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((value) => String(value || "").trim() !== ""))
    .map((row, dataIndex) => {
      const record = { __row: headerRowIndex + 2 + dataIndex };
      headers.forEach((header, colIndex) => {
        record[header] = String(row[colIndex] ?? "").trim();
      });
      return record;
    });

  return { headers, records, headerRowIndex };
}

export function cleanBuildingName(raw) {
  let name = String(raw || "").trim();

  const aptMatch = name.match(/^(?:\[.*?\]\s*)?Apartment\s+[\w-]+(?:\s*\(.*?\))?\s*,\s*(.+)/i);
  if (aptMatch) {
    const parts = aptMatch[1].split(",").map((part) => part.trim());
    name = parts[0] || name;
  }

  name = name
    .replace(/\b(one|two|three|four|five|1|2|3|4|5)\s*[-\s]?\s*bed(room)?s?\b/gi, "")
    .replace(/\bstudio\b/gi, "")
    .replace(/\b\d+\s*bhk\b/gi, "")
    .replace(/\b\d+\s*br\b/gi, "");

  name = name
    .replace(/\((?:NOT\s+)?LIVE\)/gi, "")
    .replace(/\(FSA[^)]*\)/gi, "")
    .replace(/\(Not\s+Live\)/gi, "")
    .replace(/\(NOT\s+ON\s+PF\)/gi, "")
    .replace(/\[OFFLINE\]/gi, "")
    .replace(/\[NOT\s+LIVE\]/gi, "");

  name = name.replace(/^(?:Villa|Unit)\s+[\w-]+\s*,?\s*/i, "");
  name = name.replace(/[,\-/]+$/, "").replace(/\s+/g, " ").trim();

  return name || String(raw || "").trim();
}

export function toList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload) return [];
  return payload.hits || payload.results || payload.transactions || [];
}

export function extractLocationId(location) {
  return location?.id || location?.externalID || location?.location_id || null;
}

export function extractLocationName(location) {
  return location?.name || location?.title || location?.name_l1 || "Unknown";
}

export function pickBestLocation(locations, buildingName) {
  const target = normalizeToken(buildingName);
  if (!target) return null;

  let best = null;
  let bestScore = -1;

  for (const location of locations) {
    const name = extractLocationName(location);
    const fullPath = location?.full_name
      || location?.path
      || (Array.isArray(location?.location) ? location.location.join(" ") : "");

    const normalizedName = normalizeToken(name);
    const normalizedFullPath = normalizeToken(fullPath);

    let score = 0;
    if (normalizedName === target) score += 120;
    if (normalizedName.includes(target) || target.includes(normalizedName)) score += 70;
    if (normalizedFullPath.includes(target)) score += 35;
    score += Math.max(0, 20 - Math.abs(name.length - buildingName.length));

    if (score > bestScore) {
      best = location;
      bestScore = score;
    }
  }

  return best;
}

function parseJsonResponse(responseText) {
  if (!responseText) return null;
  try {
    return JSON.parse(responseText);
  } catch {
    return { raw: responseText };
  }
}

export async function fetchJsonWithRetry(url, options, config = {}) {
  const {
    retries = 0,
    requestName = "request",
    onAttempt,
    onResponse,
    onRateLimit,
    buildErrorMessage,
  } = config;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    await onAttempt?.({ attempt });

    const response = await fetch(url, options);
    await onResponse?.({ attempt, response });

    const responseText = await response.text();
    const json = parseJsonResponse(responseText);

    if (response.ok) return json;

    if (response.status === 429 && attempt < retries) {
      const delay = 2000 * Math.pow(2, attempt);
      await onRateLimit?.({ attempt, delay, response, json });
      await sleep(delay);
      continue;
    }

    const message = buildErrorMessage
      ? buildErrorMessage({ response, json, responseText, requestName })
      : json?.message || json?.raw || `HTTP ${response.status}`;
    throw new Error(message);
  }

  throw new Error(`${requestName} failed after retries`);
}
