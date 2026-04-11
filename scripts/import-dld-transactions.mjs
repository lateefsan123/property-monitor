import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1-DgZjG5T93t5zmrHmyekKkOLwCRIYEMMOK4AbOrYOVU/export?format=csv&gid=865690319";
const SUMMARY_FILE = "reports/dld-import-summary.json";
const DLD_EXPORT_URL = "https://gateway.dubailand.gov.ae/open-data/transactions/export/csv";
const DEFAULT_LIVE_DAYS = 120;
const SQM_TO_SQFT = 10.7639;
const INSERT_BATCH_SIZE = 200;
const SAMPLE_LIMIT = 25;

const SHEET_COLUMN_ALIASES = {
  building: ["building", "tower", "project", "community", "sub community", "building name", "tower name"],
};

const DLD_COLUMN_ALIASES = {
  project: ["project", "project name", "project_name_en", "project_en", "building", "building name"],
  masterProject: ["master project", "master_project", "master_project_en", "master project name"],
  transactionDate: ["transaction date", "instance_date", "registration date", "date"],
  amount: ["amount", "actual_worth", "transaction amount", "sale amount", "value"],
  transactionType: ["transaction type", "transaction_type", "procedure_name_en", "procedure name"],
  transactionSubType: ["transaction sub type", "transaction sub type ", "transaction subtype", "procedure_type_en", "procedure type"],
  registrationType: ["registration type", "registration_type"],
  usage: ["usage", "property_usage_en", "property usage"],
  propertyType: ["property type", "property_type_en", "property type en"],
  propertySubType: ["property sub type", "property_sub_type_en", "property subtype"],
  propertySizeSqm: ["property size (sq.m)", "property size sqm", "property size", "property_size_sq_m", "property_size_sqm"],
  transactionSizeSqm: ["transaction size (sq.m)", "transaction size sqm", "transaction size", "transaction_size_sq_m", "transaction_size_sqm"],
  rooms: ["room(s)", "rooms", "room", "rooms_en"],
  parking: ["parking"],
  area: ["area", "area_name_en"],
  nearestMetro: ["nearest metro"],
  nearestMall: ["nearest mall"],
  nearestLandmark: ["nearest landmark"],
};

function printHelp() {
  console.log(`
Usage:
  npm run import:dld -- <csv-path-or-url> [--dry-run] [--sheet-url=<url>] [--overrides=<json-file>]
  npm run import:dld -- --live [--days=120] [--dry-run] [--sheet-url=<url>] [--overrides=<json-file>]

Examples:
  npm run import:dld -- .\\downloads\\transactions.csv
  npm run import:dld -- https://example.com/transactions.csv --dry-run
  npm run import:dld -- --live --days=120

Environment:
  SHEET_URL or --sheet-url       Google Sheet CSV used to decide which buildings to import
  DLD_BUILDING_OVERRIDES_FILE    Optional JSON file mapping seller buildings to DLD aliases
  DLD_LIVE_DAYS                  Default live DLD export window in days
  SUPABASE_URL / VITE_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`);
}

function parseArgs(argv) {
  const options = {
    input: null,
    dryRun: false,
    help: false,
    live: false,
    liveDays: Number(process.env.DLD_LIVE_DAYS || DEFAULT_LIVE_DAYS),
    sheetUrl: process.env.SHEET_URL || DEFAULT_SHEET_URL,
    overridesFile: process.env.DLD_BUILDING_OVERRIDES_FILE || null,
  };

  for (const argument of argv) {
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (argument === "--live") {
      options.live = true;
      continue;
    }
    if (argument.startsWith("--days=")) {
      const value = Number(argument.slice("--days=".length).trim());
      if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid --days value: ${argument}`);
      options.liveDays = Math.floor(value);
      continue;
    }
    if (argument.startsWith("--sheet-url=")) {
      options.sheetUrl = argument.slice("--sheet-url=".length).trim();
      continue;
    }
    if (argument.startsWith("--overrides=")) {
      options.overridesFile = argument.slice("--overrides=".length).trim();
      continue;
    }
    if (!options.input) {
      options.input = argument;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

function formatDldDate(dateValue) {
  const date = dateValue instanceof Date ? new Date(dateValue) : new Date(dateValue);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${dateValue}`);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

function buildDldLiveExportPayload(daysBack) {
  const toDate = new Date();
  toDate.setHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - Math.max(0, daysBack - 1));

  return {
    fromDate,
    toDate,
    body: {
      parameters: {
        P_FROM_DATE: formatDldDate(fromDate),
        P_TO_DATE: formatDldDate(toDate),
        P_GROUP_ID: "1",
        P_IS_OFFPLAN: "",
        P_IS_FREE_HOLD: "",
        P_AREA_ID: "",
        P_USAGE_ID: "1",
        P_PROP_TYPE_ID: "",
        P_TAKE: "-1",
        P_SKIP: "",
        P_SORT: "INSTANCE_DATE_DESC",
      },
      labels: {},
    },
  };
}

async function readEnvMap() {
  try {
    const raw = await fs.readFile(".env", "utf8");
    const entries = {};
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      entries[key] = value;
    }
    return entries;
  } catch {
    return {};
  }
}

function getEnvValue(envMap, names) {
  for (const name of names) {
    const value = process.env[name] || envMap[name];
    if (value) return value;
  }
  return null;
}

function normalizeToken(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function expandBoulevard(value) {
  return String(value || "").replace(/\bblvd\b\.?/gi, "Boulevard");
}

function compressBoulevard(value) {
  return String(value || "").replace(/\bboulevard\b/gi, "Blvd");
}

function replaceNumberWords(value) {
  const numberMap = {
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

  let next = String(value || "");
  for (const [word, digit] of Object.entries(numberMap)) {
    next = next.replace(new RegExp(`\\b${word}\\b`, "gi"), digit);
  }
  return next;
}

const DLD_FUZZY_STOP_WORDS = new Set([
  "the",
  "dd",
  "tower",
  "towers",
  "residence",
  "residences",
  "building",
  "buildings",
  "phase",
  "by",
  "at",
]);

function tokenizeForFuzzyMatch(value) {
  return [...new Set(
    replaceNumberWords(cleanBuildingName(value))
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token && !DLD_FUZZY_STOP_WORDS.has(token)),
  )];
}

function countTokenOverlap(leftTokens, rightTokens) {
  const right = new Set(rightTokens);
  let overlap = 0;
  for (const token of leftTokens) {
    if (right.has(token)) overlap += 1;
  }
  return overlap;
}

function isLikelyBuildingMatch(targetTokens, candidateTokens) {
  if (!targetTokens.length || !candidateTokens.length) return false;
  const overlap = countTokenOverlap(targetTokens, candidateTokens);
  if (overlap < 2) return false;
  return overlap === Math.min(targetTokens.length, candidateTokens.length);
}

function cleanBuildingName(rawValue) {
  let value = String(rawValue || "").trim();

  const apartmentMatch = value.match(/^(?:\[.*?\]\s*)?Apartment\s+[\w-]+(?:\s*\(.*?\))?\s*,\s*(.+)/i);
  if (apartmentMatch) {
    const parts = apartmentMatch[1].split(",").map((part) => part.trim());
    value = parts[0] || value;
  }

  value = value
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

  return value || String(rawValue || "").trim();
}

function buildBuildingKeyVariants(rawValue) {
  const cleaned = cleanBuildingName(rawValue);
  if (!cleaned) return [];

  const variants = new Set();
  const addVariant = (value) => {
    const normalized = normalizeToken(value);
    if (normalized) variants.add(normalized);
  };

  addVariant(cleaned);
  addVariant(expandBoulevard(cleaned));
  addVariant(compressBoulevard(cleaned));
  addVariant(replaceNumberWords(cleaned));
  addVariant(replaceNumberWords(expandBoulevard(cleaned)));
  addVariant(replaceNumberWords(compressBoulevard(cleaned)));
  return [...variants];
}

function parseNumber(rawValue) {
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) return rawValue;
  const text = String(rawValue || "").trim();
  if (!text) return null;
  const normalized = text.replace(/[, ]/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseRoomCount(rawValue) {
  const direct = parseNumber(rawValue);
  if (direct !== null) return Math.round(direct);
  const match = String(rawValue || "").match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function parseDateValue(rawValue) {
  const text = String(rawValue || "").trim();
  if (!text) return null;

  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString().slice(0, 10);

  const dayFirst = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = Number(dayFirst[2]);
    let year = Number(dayFirst[3]);
    if (year < 100) year += 2000;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }

  return null;
}

function parseCsvText(text) {
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

function makeHeadersUnique(headers) {
  const counts = {};
  return headers.map((header, index) => {
    const base = String(header || "").trim() || `Column ${index + 1}`;
    counts[base] = (counts[base] || 0) + 1;
    return counts[base] === 1 ? base : `${base} (${counts[base]})`;
  });
}

function rowsToObjects(rows) {
  if (!rows.length) return { headers: [], records: [] };

  const headers = makeHeadersUnique(rows[0].map((value, index) => String(value || "").trim() || `Column ${index + 1}`));
  const records = rows
    .slice(1)
    .filter((row) => row.some((value) => String(value || "").trim() !== ""))
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = String(row[index] ?? "").trim();
      });
      return record;
    });

  return { headers, records };
}

function inferColumn(headers, aliases) {
  const normalizedHeaders = headers.map((header) => ({ header, normalized: normalizeToken(header) }));
  const normalizedAliases = aliases.map(normalizeToken);

  for (const alias of normalizedAliases) {
    const exact = normalizedHeaders.find((entry) => entry.normalized === alias);
    if (exact) return exact.header;
  }

  for (const alias of normalizedAliases.filter((value) => value.length >= 4)) {
    const partial = normalizedHeaders.find((entry) => entry.normalized.includes(alias) || alias.includes(entry.normalized));
    if (partial) return partial.header;
  }

  return null;
}

async function readTextFromSource(source) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Failed to fetch ${source} (${response.status})`);
    return response.text();
  }

  const absolutePath = path.resolve(source);
  return fs.readFile(absolutePath, "utf8");
}

async function fetchLiveDldCsv(daysBack) {
  const { fromDate, toDate, body } = buildDldLiveExportPayload(daysBack);
  const response = await fetch(DLD_EXPORT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch live DLD export (${response.status})`);
  }

  const csvText = await response.text();
  if (!csvText || csvText.trim().startsWith("<!DOCTYPE html")) {
    throw new Error("Live DLD export returned an unexpected response.");
  }

  return {
    csvText,
    period: {
      fromDate: fromDate.toISOString().slice(0, 10),
      toDate: toDate.toISOString().slice(0, 10),
    },
  };
}

async function loadBuildingOverrides(filePath) {
  if (!filePath) return new Map();

  const absolutePath = path.resolve(filePath);
  const raw = await fs.readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw);
  const overrides = new Map();

  for (const [buildingName, aliases] of Object.entries(parsed || {})) {
    const canonicalKey = buildBuildingKeyVariants(buildingName)[0];
    if (!canonicalKey) continue;

    const aliasSet = new Set(buildBuildingKeyVariants(buildingName));
    if (Array.isArray(aliases)) {
      for (const alias of aliases) {
        for (const variant of buildBuildingKeyVariants(alias)) aliasSet.add(variant);
      }
    }
    overrides.set(canonicalKey, aliasSet);
  }

  return overrides;
}

async function loadTargetBuildings(sheetUrl, overrides) {
  const csvText = await readTextFromSource(sheetUrl);
  const rows = parseCsvText(csvText);
  const { headers, records } = rowsToObjects(rows);
  const buildingColumn = inferColumn(headers, SHEET_COLUMN_ALIASES.building);

  if (!buildingColumn) {
    throw new Error("Could not find a building column in the seller sheet.");
  }

  const targets = new Map();
  const aliasLookup = new Map();

  for (const record of records) {
    const buildingName = cleanBuildingName(record[buildingColumn]);
    if (!buildingName) continue;

    const canonicalKey = buildBuildingKeyVariants(buildingName)[0];
    if (!canonicalKey) continue;

    if (!targets.has(canonicalKey)) {
      targets.set(canonicalKey, {
        key: canonicalKey,
        name: buildingName,
        aliases: new Set(),
        fuzzyTokens: tokenizeForFuzzyMatch(buildingName),
      });
    }

    const target = targets.get(canonicalKey);
    for (const variant of buildBuildingKeyVariants(buildingName)) target.aliases.add(variant);

    const overrideAliases = overrides.get(canonicalKey);
    if (overrideAliases) {
      for (const alias of overrideAliases) target.aliases.add(alias);
    }
  }

  for (const target of targets.values()) {
    for (const alias of target.aliases) aliasLookup.set(alias, target.key);
  }

  return { targets, aliasLookup };
}

function resolveDldColumns(headers) {
  return Object.fromEntries(
    Object.entries(DLD_COLUMN_ALIASES).map(([key, aliases]) => [key, inferColumn(headers, aliases)]),
  );
}

function buildTransactionCategory(record, columns) {
  const parts = [
    record[columns.transactionType],
    record[columns.transactionSubType],
    record[columns.registrationType],
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return parts.join(" | ") || null;
}

function isSaleTransaction(record, columns) {
  const combined = [
    record[columns.transactionType],
    record[columns.transactionSubType],
    record[columns.registrationType],
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ");

  if (!combined) return true;

  const normalized = normalizeToken(combined);
  const excludeTokens = [
    "mortgage",
    "gift",
    "gifts",
    "inheritance",
    "lease",
    "rent",
    "rental",
    "separation",
    "subseparation",
    "merge",
  ];

  if (excludeTokens.some((token) => normalized.includes(token))) return false;
  if (normalized.includes("sale") || normalized.includes("sell")) return true;

  return false;
}

function resolveBuildingMatch(record, columns, aliasLookup, targets) {
  const candidates = [
    record[columns.project],
    record[columns.masterProject],
  ]
    .map((value) => cleanBuildingName(value))
    .filter(Boolean);

  for (const candidate of candidates) {
    for (const variant of buildBuildingKeyVariants(candidate)) {
      if (aliasLookup.has(variant)) {
        return {
          matchedKey: aliasLookup.get(variant),
          matchedName: candidate,
        };
      }
    }
  }

  const candidateTokens = [...new Set(candidates.flatMap((candidate) => tokenizeForFuzzyMatch(candidate)))];
  if (candidateTokens.length) {
    for (const [targetKey, target] of targets.entries()) {
      if (isLikelyBuildingMatch(target.fuzzyTokens, candidateTokens)) {
        return {
          matchedKey: targetKey,
          matchedName: candidates[0] || target.name,
        };
      }
    }
  }

  return null;
}

function buildLocationLabel(record, columns) {
  return [
    record[columns.project],
    record[columns.masterProject],
    record[columns.area],
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" | ") || null;
}

function convertSqmToSqft(value) {
  if (value === null || value === undefined) return null;
  return Math.round(value * SQM_TO_SQFT * 100) / 100;
}

async function syncIntoSupabase({ buildingsByKey, envMap, dryRun }) {
  const supabaseUrl = getEnvValue(envMap, ["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  const serviceRoleKey = getEnvValue(envMap, ["SUPABASE_SERVICE_ROLE_KEY"]);

  if (!supabaseUrl || !serviceRoleKey) {
    if (dryRun) return { synced: false, reason: "Missing Supabase credentials in dry-run mode." };
    throw new Error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  if (dryRun) return { synced: false, reason: "Dry run enabled." };

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const buildingKeys = Object.keys(buildingsByKey);
  if (!buildingKeys.length) return { synced: true, buildingsUpserted: 0, transactionsInserted: 0 };

  const { data: existingBuildingRows, error: existingBuildingsError } = await supabase
    .from("buildings")
    .select("key, location_id")
    .in("key", buildingKeys);

  if (existingBuildingsError) throw new Error(existingBuildingsError.message);

  const existingLocationIds = new Map((existingBuildingRows || []).map((row) => [row.key, row.location_id || null]));

  const buildingRows = Object.values(buildingsByKey).map((building) => ({
    key: building.key,
    search_name: building.searchName || building.key,
    location_name: building.locationName || building.searchName || null,
    location_id: existingLocationIds.get(building.key) || null,
  }));

  const { error: buildingsError } = await supabase.from("buildings").upsert(buildingRows, { onConflict: "key" });
  if (buildingsError) throw new Error(buildingsError.message);

  const { error: deleteError } = await supabase.from("transactions").delete().in("building_key", buildingKeys);
  if (deleteError) throw new Error(deleteError.message);

  let insertedTransactions = 0;
  let batch = [];

  for (const building of Object.values(buildingsByKey)) {
    for (const transaction of building.transactions) {
      batch.push(transaction);
      if (batch.length >= INSERT_BATCH_SIZE) {
        const { error } = await supabase.from("transactions").insert(batch);
        if (error) throw new Error(error.message);
        insertedTransactions += batch.length;
        batch = [];
      }
    }
  }

  if (batch.length) {
    const { error } = await supabase.from("transactions").insert(batch);
    if (error) throw new Error(error.message);
    insertedTransactions += batch.length;
  }

  return {
    synced: true,
    buildingsUpserted: buildingRows.length,
    transactionsInserted: insertedTransactions,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (!options.input && !options.live) {
    printHelp();
    throw new Error("Missing DLD CSV input path/URL or --live.");
  }

  const envMap = await readEnvMap();
  const overrides = await loadBuildingOverrides(options.overridesFile);

  console.log("Loading seller sheet...");
  const { targets, aliasLookup } = await loadTargetBuildings(options.sheetUrl, overrides);
  console.log(`Loaded ${targets.size} target buildings from seller sheet.`);

  console.log("Loading DLD CSV...");
  let dldCsvText = "";
  let livePeriod = null;
  if (options.live) {
    const liveExport = await fetchLiveDldCsv(options.liveDays);
    dldCsvText = liveExport.csvText;
    livePeriod = liveExport.period;
    console.log(`Fetched live DLD export for ${livePeriod.fromDate} to ${livePeriod.toDate}.`);
  } else {
    dldCsvText = await readTextFromSource(options.input);
  }
  const dldRows = parseCsvText(dldCsvText);
  const { headers, records } = rowsToObjects(dldRows);
  const columns = resolveDldColumns(headers);

  if (!columns.project && !columns.masterProject) {
    throw new Error("Could not find Project or Master Project columns in the DLD CSV.");
  }
  if (!columns.transactionDate || !columns.amount) {
    throw new Error("Could not find Transaction Date and Amount columns in the DLD CSV.");
  }

  const buildingsByKey = {};
  const seenTransactions = new Set();
  const unmatchedExamples = new Set();
  let saleRows = 0;
  let matchedRows = 0;
  let skippedInvalidRows = 0;
  let skippedNonSaleRows = 0;

  for (const record of records) {
    if (!isSaleTransaction(record, columns)) {
      skippedNonSaleRows += 1;
      continue;
    }
    saleRows += 1;

    const match = resolveBuildingMatch(record, columns, aliasLookup, targets);
    if (!match) {
      if (unmatchedExamples.size < SAMPLE_LIMIT) {
        unmatchedExamples.add(
          [record[columns.project], record[columns.masterProject], record[columns.area]]
            .map((value) => String(value || "").trim())
            .filter(Boolean)
            .join(" | ") || "Unknown",
        );
      }
      continue;
    }

    const date = parseDateValue(record[columns.transactionDate]);
    const amount = parseNumber(record[columns.amount]);
    if (!date || amount === null) {
      skippedInvalidRows += 1;
      continue;
    }

    const propertySizeSqm = parseNumber(record[columns.propertySizeSqm]) ?? parseNumber(record[columns.transactionSizeSqm]);
    const beds = parseRoomCount(record[columns.rooms]);
    const projectName = String(record[columns.project] || "").trim();
    const masterProjectName = String(record[columns.masterProject] || "").trim();
    const areaName = String(record[columns.area] || "").trim();
    const category = buildTransactionCategory(record, columns);
    const locationName = projectName || masterProjectName || areaName || targets.get(match.matchedKey)?.name || null;
    const fullLocation = buildLocationLabel(record, columns);
    const propertyType = [record[columns.propertySubType], record[columns.propertyType]]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" | ") || null;
    const occupancyStatus = [record[columns.usage], record[columns.parking]]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" | ") || null;

    const dedupeKey = [
      match.matchedKey,
      date,
      amount,
      normalizeToken(projectName || masterProjectName),
      normalizeToken(category),
      beds ?? "",
      propertySizeSqm ?? "",
    ].join("|");
    if (seenTransactions.has(dedupeKey)) continue;
    seenTransactions.add(dedupeKey);

    if (!buildingsByKey[match.matchedKey]) {
      const target = targets.get(match.matchedKey);
      buildingsByKey[match.matchedKey] = {
        key: match.matchedKey,
        searchName: target?.name || match.matchedName,
        locationName: areaName || locationName,
        transactions: [],
      };
    }

    buildingsByKey[match.matchedKey].transactions.push({
      building_key: match.matchedKey,
      amount,
      category,
      date,
      floor: null,
      beds,
      property_type: propertyType,
      builtup_area_sqft: convertSqmToSqft(propertySizeSqm),
      occupancy_status: occupancyStatus,
      location_name: locationName,
      full_location: fullLocation,
      latitude: null,
      longitude: null,
    });
    matchedRows += 1;
  }

  const totalTransactions = Object.values(buildingsByKey).reduce((sum, building) => sum + building.transactions.length, 0);

  console.log(`DLD rows scanned: ${records.length}`);
  console.log(`Sale rows considered: ${saleRows}`);
  console.log(`Matched transactions: ${matchedRows}`);
  console.log(`Imported buildings: ${Object.keys(buildingsByKey).length}`);

  const syncSummary = await syncIntoSupabase({ buildingsByKey, envMap, dryRun: options.dryRun });

  const summary = {
    generatedAt: new Date().toISOString(),
    input: options.live ? "live-dld-export" : options.input,
    live: options.live,
    liveDays: options.live ? options.liveDays : null,
    livePeriod,
    sheetUrl: options.sheetUrl,
    dryRun: options.dryRun,
    summary: {
      targetBuildings: targets.size,
      dldRows: records.length,
      saleRows,
      matchedTransactions: matchedRows,
      importedBuildings: Object.keys(buildingsByKey).length,
      insertedTransactions: totalTransactions,
      skippedNonSaleRows,
      skippedInvalidRows,
      unmatchedExamples: [...unmatchedExamples],
    },
    sync: syncSummary,
  };

  await fs.mkdir(path.dirname(SUMMARY_FILE), { recursive: true });
  await fs.writeFile(SUMMARY_FILE, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(`Summary written to ${SUMMARY_FILE}`);
  if (syncSummary.synced) {
    console.log(`Supabase synced: ${syncSummary.buildingsUpserted} buildings, ${syncSummary.transactionsInserted} transactions.`);
  } else {
    console.log(`Supabase sync skipped: ${syncSummary.reason}`);
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [
      "## DLD Transaction Sync",
      `- Input: ${summary.input}`,
      livePeriod ? `- Live period: ${livePeriod.fromDate} to ${livePeriod.toDate}` : null,
      `- Target buildings: ${targets.size}`,
      `- DLD rows scanned: ${records.length}`,
      `- Matched transactions: ${matchedRows}`,
      `- Imported buildings: ${Object.keys(buildingsByKey).length}`,
      syncSummary.synced
        ? `- Supabase synced: ${syncSummary.buildingsUpserted} buildings, ${syncSummary.transactionsInserted} transactions`
        : `- Supabase sync skipped: ${syncSummary.reason}`,
    ].filter(Boolean);
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`, "utf8");
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
