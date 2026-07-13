export function normalizeToken(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function expandBoulevard(value) {
  return String(value || "").replace(/\bblvd\b\.?/gi, "Boulevard");
}

function compressBoulevard(value) {
  return String(value || "").replace(/\bboulevard\b/gi, "Blvd");
}

function stripLocationSuffix(value) {
  return String(value || "")
    .replace(/,\s*(Downtown Dubai|Downtown|Old Town Dubai|Old Town|Business Bay|City Walk|DIFC|Sheikh Zayed Road|Port de La Mer|Za'abeel|Zaabeel)\s*$/i, "")
    .replace(/\b(Downtown Dubai|Downtown|Old Town Dubai|Old Town|Business Bay|City Walk|DIFC|Port de La Mer|Za'abeel|Zaabeel)\s*$/i, "")
    .replace(/\bDubai\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function expandCommonBuildingAbbreviations(value) {
  return String(value || "")
    .replace(/&/g, " and ")
    .replace(/\bblvd\.?\b/gi, "Boulevard")
    .replace(/\bbldg\.?\b/gi, "Building")
    .replace(/\btwr\.?\b/gi, "Tower")
    .replace(/\bresid\.?\b/gi, "Residence")
    .replace(/\bres\.?\b/gi, "Residence")
    .replace(/\bapts?\.?\b/gi, "Apartments")
    .replace(/\bapt\.?\b/gi, "Apartment");
}

function compressCommonBuildingAbbreviations(value) {
  return String(value || "")
    .replace(/&/g, " and ")
    .replace(/\bboulevard\b/gi, "Blvd")
    .replace(/\bbuilding\b/gi, "Bldg")
    .replace(/\btower\b/gi, "Twr")
    .replace(/\bresidence\b/gi, "Res")
    .replace(/\bapartments?\b/gi, "Apt");
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

function replaceRomanNumerals(value) {
  return String(value || "")
    .replace(/\bii\b/gi, "2")
    .replace(/\biii\b/gi, "3")
    .replace(/\biv\b/gi, "4");
}

function toggleLeadingArticle(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return [];
  if (/^the\s+/i.test(trimmed)) return [trimmed.replace(/^the\s+/i, "").trim()];
  return [`The ${trimmed}`];
}

function expandTowerVariant(value) {
  const trimmed = String(value || "").trim();
  const match = trimmed.match(/^(.*?)(?:\s+Tower|\s+T)\s*([A-Z]|\d+)$/i)
    || trimmed.match(/^(.*?)[\s-]+([A-Z]|\d+)$/i);
  if (!match) return [];

  const base = match[1].trim();
  const suffix = match[2].trim();
  if (!base || !suffix) return [];
  return [`${base} ${suffix}`, `${base} T${suffix}`, `${base} Tower ${suffix}`];
}

function toggleResidencePlurality(value) {
  const trimmed = String(value || "").trim();
  const variants = [];
  if (/\bresidences\b/i.test(trimmed)) variants.push(trimmed.replace(/\bresidences\b/gi, "Residence"));
  if (/\bresidence\b/i.test(trimmed)) variants.push(trimmed.replace(/\bresidence\b/gi, "Residences"));
  return variants;
}

function toggleTowerLetterNumber(value) {
  const trimmed = String(value || "").trim();
  const variants = [];
  if (/\bTower\s+A\b/i.test(trimmed)) variants.push(trimmed.replace(/\bTower\s+A\b/gi, "Tower 1"));
  if (/\bTower\s+B\b/i.test(trimmed)) variants.push(trimmed.replace(/\bTower\s+B\b/gi, "Tower 2"));
  if (/\bTower\s+1\b/i.test(trimmed)) variants.push(trimmed.replace(/\bTower\s+1\b/gi, "Tower A"));
  if (/\bTower\s+2\b/i.test(trimmed)) variants.push(trimmed.replace(/\bTower\s+2\b/gi, "Tower B"));
  return variants;
}

function extractParentheticalVariants(value) {
  const trimmed = String(value || "").trim();
  const variants = [];
  for (const match of trimmed.matchAll(/\(([^)]+)\)/g)) {
    if (match[1]) variants.push(match[1].trim());
  }

  const withoutParentheses = trimmed.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  if (withoutParentheses && withoutParentheses !== trimmed) variants.push(withoutParentheses);
  return variants;
}

function removeDescriptorWords(value) {
  const next = String(value || "")
    .replace(/\b(towers?|buildings?|blocks?|offices?|hotels?|apartments?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return next && next !== value ? [next] : [];
}

function getRawBuildingNameVariants(rawValue) {
  const cleaned = cleanBuildingName(rawValue);
  const preferred = stripLocationSuffix(cleaned) || cleaned;
  const variants = new Set([preferred, cleaned]);
  const queue = [...variants];

  while (queue.length && variants.size < 180) {
    const current = queue.shift();
    for (const next of [
      stripLocationSuffix(current),
      replaceNumberWords(current),
      replaceRomanNumerals(current),
      expandBoulevard(current),
      compressBoulevard(current),
      expandCommonBuildingAbbreviations(current),
      compressCommonBuildingAbbreviations(current),
      ...toggleLeadingArticle(current),
      ...expandTowerVariant(current),
      ...toggleResidencePlurality(current),
      ...toggleTowerLetterNumber(current),
      current.replace(/\s+(?:Tower\s+|T\s*)?(?:\d+|[A-Z])$/i, ""),
      ...extractParentheticalVariants(current),
      ...removeDescriptorWords(current),
    ]) {
      const trimmed = String(next || "").replace(/\s+/g, " ").trim();
      if (!trimmed || variants.has(trimmed)) continue;
      variants.add(trimmed);
      queue.push(trimmed);
    }
  }

  return [...variants].filter(Boolean);
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
  return replaceRomanNumerals(replaceNumberWords(expandCommonBuildingAbbreviations(cleanBuildingName(value))))
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
  if (overlap < 2) return false;
  return overlap === Math.min(targetTokens.length, candidateTokens.length);
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

  const keys = new Set();
  for (const variant of getRawBuildingNameVariants(cleaned)) {
    for (const form of [
      variant,
      stripLocationSuffix(variant),
      replaceNumberWords(variant),
      replaceRomanNumerals(variant),
      expandCommonBuildingAbbreviations(variant),
      compressCommonBuildingAbbreviations(variant),
      replaceNumberWords(expandCommonBuildingAbbreviations(variant)),
      replaceNumberWords(compressCommonBuildingAbbreviations(variant)),
    ]) {
      const normalized = normalizeToken(
        String(form || "")
          .replace(/\bresidences\b/gi, "Residence")
          .replace(/\btowers\b/gi, "Tower"),
      );
      if (normalized) keys.add(normalized);
    }
  }

  return [...keys];
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

  // Prefer every exact header match before considering fuzzy matches. Otherwise
  // a broad alias such as "community" can win before the later exact
  // "building name" alias in seller spreadsheets.
  for (const alias of aliases) {
    const normalizedAlias = normalizeToken(alias);
    const exact = normalizedHeaders.find((header) => header.normalized === normalizedAlias);
    if (exact) return exact.raw;
  }

  for (const alias of aliases) {
    const aliasTokens = tokenizeForFuzzyMatch(alias);
    const fuzzy = normalizedHeaders.find((header) => isLikelyBuildingMatch(aliasTokens, header.tokens));
    if (fuzzy) return fuzzy.raw;
  }

  return null;
}
