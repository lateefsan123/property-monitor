export function normalizeToken(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function expandBoulevard(value) {
  return String(value || "").replace(/\bblvd\b\.?/gi, "Boulevard");
}

function compressBoulevard(value) {
  return String(value || "").replace(/\bboulevard\b/gi, "Blvd");
}

function replaceNumberWords(value) {
  const words = {
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    ten: "10",
  };
  let result = String(value || "");
  for (const [word, number] of Object.entries(words)) {
    result = result.replace(new RegExp(`\\b${word}\\b`, "gi"), number);
  }
  return result;
}

const DLD_FUZZY_STOP_WORDS = new Set([
  "the",
  "tower",
  "towers",
  "residence",
  "residences",
  "building",
  "apartments",
  "apartment",
  "project",
]);

function tokenizeForFuzzyMatch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token && !DLD_FUZZY_STOP_WORDS.has(token));
}

function countTokenOverlap(leftTokens, rightTokens) {
  const rightSet = new Set(rightTokens);
  let matches = 0;
  for (const token of leftTokens) {
    if (rightSet.has(token)) matches += 1;
  }
  return matches;
}

export function isLikelyBuildingMatch(targetTokens, candidateTokens) {
  if (!targetTokens.length || !candidateTokens.length) return false;
  const overlap = countTokenOverlap(targetTokens, candidateTokens);
  const longest = Math.max(targetTokens.length, candidateTokens.length);
  return overlap >= Math.min(2, targetTokens.length, candidateTokens.length)
    || (longest > 0 && overlap / longest >= 0.67);
}

export function cleanBuildingName(rawValue) {
  let name = String(rawValue || "").trim();
  if (!name) return "";

  const apartmentMatch = name.match(/^(?:\[.*?\]\s*)?Apartment\s+[\w-]+(?:\s*\(.*?\))?\s*,\s*(.+)/i);
  if (apartmentMatch) {
    const parts = apartmentMatch[1].split(",").map((part) => part.trim());
    name = parts[0] || name;
  }

  return name
    .replace(/\b(one|two|three|four|five|1|2|3|4|5)\s*[-\s]?\s*bed(room)?s?\b/gi, "")
    .replace(/\bstudio\b/gi, "")
    .replace(/\b\d+\s*bhk\b/gi, "")
    .replace(/\b\d+\s*br\b/gi, "")
    .replace(/\((?:NOT\s+)?LIVE\)/gi, "")
    .replace(/\(FSA[^)]*\)/gi, "")
    .replace(/\(Not\s+Live\)/gi, "")
    .replace(/\(NOT\s+ON\s+PF\)/gi, "")
    .replace(/\[OFFLINE\]/gi, "")
    .replace(/\[NOT\s+LIVE\]/gi, "")
    .replace(/^(?:Villa|Unit)\s+[\w-]+\s*,?\s*/i, "")
    .replace(/[,\-/]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildBuildingKeyVariants(rawValue) {
  const cleaned = cleanBuildingName(rawValue);
  if (!cleaned) return [];

  const variants = new Set([
    cleaned,
    expandBoulevard(cleaned),
    compressBoulevard(cleaned),
    replaceNumberWords(cleaned),
  ]);
  for (const variant of [...variants]) {
    variants.add(expandBoulevard(replaceNumberWords(variant)));
    variants.add(compressBoulevard(replaceNumberWords(variant)));
  }

  return [...variants]
    .map((value) => value.trim())
    .filter(Boolean);
}

export function parseNumber(rawValue) {
  const normalized = String(rawValue ?? "").replace(/[^0-9.-]+/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseRoomCount(rawValue) {
  const match = String(rawValue || "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

export function parseDateValue(rawValue) {
  const trimmed = String(rawValue || "").trim();
  if (!trimmed) return null;

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct;

  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseCsvText(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === "\"") {
      if (inQuotes && nextCharacter === "\"") {
        value += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(value);
      const isBlankRow = row.every((cell) => !String(cell || "").trim());
      if (!isBlankRow) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += character;
  }

  row.push(value);
  if (row.some((cell) => String(cell || "").trim())) rows.push(row);
  return rows;
}

function makeHeadersUnique(headers) {
  const seen = new Map();
  return headers.map((header) => {
    const count = seen.get(header) || 0;
    seen.set(header, count + 1);
    return count === 0 ? header : `${header}_${count + 1}`;
  });
}

export function rowsToObjects(rows) {
  if (!rows.length) return { headers: [], records: [] };
  const [headerRow, ...bodyRows] = rows;
  const headers = makeHeadersUnique(headerRow.map((header) => String(header || "").trim()));
  const records = bodyRows.map((cells, index) => {
    const record = { __row: index + 2 };
    headers.forEach((header, headerIndex) => {
      record[header] = cells[headerIndex] ?? "";
    });
    return record;
  });
  return { headers, records };
}

export function inferColumn(headers, aliases) {
  const normalizedHeaders = headers.map((header) => ({
    raw: header,
    normalized: normalizeToken(header),
    tokens: tokenizeForFuzzyMatch(header),
  }));

  for (const alias of aliases) {
    const normalizedAlias = normalizeToken(alias);
    const aliasTokens = tokenizeForFuzzyMatch(alias);

    const exact = normalizedHeaders.find((header) => header.normalized === normalizedAlias);
    if (exact) return exact.raw;

    const fuzzy = normalizedHeaders.find((header) => isLikelyBuildingMatch(aliasTokens, header.tokens));
    if (fuzzy) return fuzzy.raw;
  }

  return null;
}
