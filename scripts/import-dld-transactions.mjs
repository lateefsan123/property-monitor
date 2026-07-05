import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import {
  buildBuildingKeyVariants,
  cleanBuildingName,
  inferColumn,
  isLikelyBuildingMatch,
  normalizeToken,
  parseCsvText,
  parseDateValue,
  parseNumber,
  parseRoomCount,
  rowsToObjects,
} from "./lib/dld-import-utils.mjs";

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1-DgZjG5T93t5zmrHmyekKkOLwCRIYEMMOK4AbOrYOVU/export?format=csv&gid=865690319";
const SUMMARY_FILE = "reports/dld-import-summary.json";
const DLD_EXPORT_URL = "https://gateway.dubailand.gov.ae/open-data/transactions/export/csv";
const DEFAULT_LIVE_DAYS = 120;
const SQM_TO_SQFT = 10.7639;
const INSERT_BATCH_SIZE = 200;
const SAMPLE_LIMIT = 25;
const ENABLE_FUZZY_MATCHING = process.env.DLD_ENABLE_FUZZY_MATCHING === "true";

const SHEET_COLUMN_ALIASES = {
  building: ["building", "tower", "project", "community", "sub community", "building name", "tower name"],
};

const DLD_COLUMN_ALIASES = {
  project: ["project", "project name", "project_name_en", "project_en", "building", "building name"],
  masterProject: ["master project", "master_project", "master_project_en", "master project name"],
  transactionDate: ["transaction date", "instance_date", "registration date", "date"],
  amount: ["amount", "actual_worth", "trans_value", "transaction amount", "sale amount", "value"],
  transactionType: ["transaction type", "transaction_type", "procedure_en", "procedure_name_en", "procedure name"],
  transactionSubType: ["transaction sub type", "transaction sub type ", "transaction subtype", "procedure_type_en", "procedure type"],
  registrationType: ["registration type", "registration_type"],
  usage: ["usage", "usage_en", "property_usage_en", "property usage"],
  propertyType: ["property type", "prop_type_en", "property_type_en", "property type en"],
  propertySubType: ["property sub type", "prop_sb_type_en", "property_sub_type_en", "property subtype"],
  propertySizeSqm: ["actual_area", "property size (sq.m)", "property size sqm", "property size", "property_size_sq_m", "property_size_sqm"],
  transactionSizeSqm: ["procedure_area", "transaction size (sq.m)", "transaction size sqm", "transaction size", "transaction_size_sq_m", "transaction_size_sqm"],
  rooms: ["room(s)", "rooms", "rooms_en", "room"],
  parking: ["parking"],
  area: ["area", "area_en", "area_name_en"],
  nearestMetro: ["nearest metro", "nearest_metro_en"],
  nearestMall: ["nearest mall", "nearest_mall_en"],
  nearestLandmark: ["nearest landmark", "nearest_landmark_en"],
};

function printHelp() {
  console.log(`
Usage:
  npm run import:dld -- <csv-path-or-url> [--dry-run] [--sheet-url=<url>] [--overrides=<json-file>]
  npm run import:dld -- --live [--days=120] [--dry-run] [--sheet-url=<url>] [--overrides=<json-file>]

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

function formatLocalIsoDate(dateValue) {
  const date = dateValue instanceof Date ? new Date(dateValue) : new Date(dateValue);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${dateValue}`);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
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
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
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

const TOKEN_STOP_WORDS = new Set([
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

function tokenizeForFuzzyMatch(value) {
  return [...new Set(
    replaceNumberWords(cleanBuildingName(value))
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token && !TOKEN_STOP_WORDS.has(token)),
  )];
}

function normalizeBuildingLookupKey(value) {
  return normalizeToken(replaceNumberWords(value));
}

function makeHeadersUnique(headers) {
  const seen = new Map();
  return headers.map((header) => {
    const count = seen.get(header) || 0;
    seen.set(header, count + 1);
    return count === 0 ? header : `${header}_${count + 1}`;
  });
}

function rowsToObjectsFromHeaderIndex(rows, headerIndex) {
  const headerRow = rows[headerIndex] || [];
  const bodyRows = rows.slice(headerIndex + 1);
  const headers = makeHeadersUnique(headerRow.map((header) => String(header || "").trim()));
  const records = bodyRows.map((cells, index) => {
    const record = { __row: headerIndex + index + 2 };
    headers.forEach((header, columnIndex) => {
      record[header] = cells[columnIndex] ?? "";
    });
    return record;
  });
  return { headers, records };
}

function rowsToObjectsUsingBestHeader(rows, getHeaderScore) {
  if (!rows.length) return { headers: [], records: [] };

  let bestIndex = 0;
  let bestScore = -1;
  const scanLimit = Math.min(rows.length, 10);
  for (let index = 0; index < scanLimit; index += 1) {
    const headers = rows[index].map((header) => String(header || "").trim());
    const score = getHeaderScore(headers);
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  }

  return rowsToObjectsFromHeaderIndex(rows, bestIndex);
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
      fromDate: formatLocalIsoDate(fromDate),
      toDate: formatLocalIsoDate(toDate),
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
  const { headers, records } = rowsToObjectsUsingBestHeader(rows, (candidateHeaders) =>
    inferColumn(candidateHeaders, SHEET_COLUMN_ALIASES.building) ? 1 : 0,
  );
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
    for (const alias of target.aliases) {
      const lookupKey = normalizeBuildingLookupKey(alias);
      if (lookupKey) aliasLookup.set(lookupKey, target.key);
    }
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
      const lookupKey = normalizeBuildingLookupKey(variant);
      if (aliasLookup.has(lookupKey)) {
        return {
          matchedKey: aliasLookup.get(lookupKey),
          matchedName: candidate,
        };
      }
    }
  }

  if (!ENABLE_FUZZY_MATCHING) return null;

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

function summarizeMatchedBuildings(buildingsByKey) {
  return Object.values(buildingsByKey)
    .map((building) => {
      const locationCounts = new Map();
      let latestDate = null;
      for (const transaction of building.transactions) {
        const transactionDate = formatLocalIsoDate(transaction.date);
        if (!latestDate || transactionDate > latestDate) latestDate = transactionDate;
        const locationName = transaction.location_name || transaction.full_location || "Unknown";
        locationCounts.set(locationName, (locationCounts.get(locationName) || 0) + 1);
      }

      return {
        building: building.searchName || building.key,
        buildingKey: building.key,
        transactionCount: building.transactions.length,
        latestDate,
        sampleLocations: [...locationCounts.entries()]
          .sort((left, right) => right[1] - left[1])
          .slice(0, 3)
          .map(([name, count]) => ({ name, count })),
      };
    })
    .sort((left, right) =>
      String(right.latestDate || "").localeCompare(String(left.latestDate || ""))
      || right.transactionCount - left.transactionCount
      || String(left.building).localeCompare(String(right.building)),
    );
}

async function syncIntoSupabase({ buildingsByKey, envMap, dryRun, refreshBuildingKeys = [] }) {
  const supabaseUrl = getEnvValue(envMap, ["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  const serviceRoleKey = getEnvValue(envMap, ["SUPABASE_SERVICE_ROLE_KEY"]);

  if (!supabaseUrl || !serviceRoleKey) {
    if (dryRun) return { synced: false, reason: "Missing Supabase credentials in dry-run mode." };
    throw new Error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  if (dryRun) return { synced: false, reason: "Dry run enabled." };

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const buildingKeys = Object.keys(buildingsByKey);
  const buildingKeysToRefresh = [...new Set((refreshBuildingKeys.length ? refreshBuildingKeys : buildingKeys).filter(Boolean))];
  if (!buildingKeysToRefresh.length) return { synced: true, buildingsRefreshed: 0, buildingsUpserted: 0, transactionsInserted: 0 };

  let buildingRows = [];
  if (buildingKeys.length) {
    const { data: existingBuildingRows, error: existingBuildingsError } = await supabase
      .from("buildings")
      .select("key, location_id")
      .in("key", buildingKeys);

    if (existingBuildingsError) throw new Error(existingBuildingsError.message);

    const existingLocationIds = new Map((existingBuildingRows || []).map((row) => [row.key, row.location_id || null]));

    buildingRows = Object.values(buildingsByKey).map((building) => ({
      key: building.key,
      search_name: building.searchName || building.key,
      location_name: building.locationName || building.searchName || null,
      location_id: existingLocationIds.get(building.key) || null,
    }));
  }

  if (buildingRows.length) {
    const { error: buildingsError } = await supabase.from("buildings").upsert(buildingRows, { onConflict: "key" });
    if (buildingsError) throw new Error(buildingsError.message);
  }

  const { error: deleteError } = await supabase.from("transactions").delete().in("building_key", buildingKeysToRefresh);
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
    buildingsRefreshed: buildingKeysToRefresh.length,
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
  const matchedBuildings = summarizeMatchedBuildings(buildingsByKey);

  console.log(`DLD rows scanned: ${records.length}`);
  console.log(`Sale rows considered: ${saleRows}`);
  console.log(`Matched transactions: ${matchedRows}`);
  console.log(`Imported buildings: ${Object.keys(buildingsByKey).length}`);

  const syncSummary = await syncIntoSupabase({
    buildingsByKey,
    envMap,
    dryRun: options.dryRun,
    refreshBuildingKeys: [...targets.keys()],
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    input: options.live ? "live-dld-export" : options.input,
    live: options.live,
    liveDays: options.live ? options.liveDays : null,
    livePeriod,
    sheetUrl: options.sheetUrl,
    dryRun: options.dryRun,
    fuzzyMatching: ENABLE_FUZZY_MATCHING,
    summary: {
      targetBuildings: targets.size,
      dldRows: records.length,
      saleRows,
      matchedTransactions: matchedRows,
      importedBuildings: Object.keys(buildingsByKey).length,
      insertedTransactions: totalTransactions,
      matchedBuildings,
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
    console.log(`Supabase synced: ${syncSummary.buildingsUpserted} buildings, ${syncSummary.transactionsInserted} transactions. Refreshed ${syncSummary.buildingsRefreshed} seller buildings.`);
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
