import fs from "node:fs/promises";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import {
  inferColumn,
  parseCsvText,
  parseDateValue,
  parseNumber,
  rowsToObjects,
} from "./lib/dld-import-utils.mjs";
import {
  DEFAULT_BUILDING_REGISTRY_FILE,
  DEFAULT_SHEET_URL,
  addSupabaseLeadTargets,
  buildTargetAliasLookup,
  formatDldDate,
  formatLocalIsoDate,
  getEnvValue,
  loadBuildingOverrides,
  loadRegistryAliases,
  loadTargetBuildings,
  readEnvMap,
  resolveBuildingMatch,
} from "./import-dld-transactions.mjs";

const DLD_RENTS_EXPORT_URL = "https://gateway.dubailand.gov.ae/open-data/rents/export/csv";
const SUMMARY_FILE = "reports/dld-rents-import-summary.json";
const DEFAULT_LIVE_DAYS = 35;
const INSERT_BATCH_SIZE = 200;
const SAMPLE_LIMIT = 25;

const RENT_COLUMN_ALIASES = {
  project: ["project_en", "project", "project name"],
  masterProject: ["master_project_en", "master project", "master_project"],
  registrationDate: ["registration_date", "registration date"],
  startDate: ["start_date", "start date"],
  endDate: ["end_date", "end date"],
  annualAmount: ["annual_amount", "annual amount"],
  contractAmount: ["contract_amount", "contract amount"],
  version: ["version_en", "version"],
  rooms: ["rooms", "room(s)"],
  actualArea: ["actual_area", "actual area"],
  propType: ["prop_type_en", "property type"],
  propSubType: ["prop_sub_type_en", "property sub type"],
  usage: ["usage_en", "usage"],
  area: ["area_en", "area"],
  contractNumber: ["contract_number", "contract number"],
  versionNumber: ["version_number", "version number"],
};

function printHelp() {
  console.log(`
Usage:
  npm run import:rents -- --live [--days=${DEFAULT_LIVE_DAYS}] [--dry-run] [--sheet-url=<url>]
  npm run import:rents -- <csv-path-or-url> [--dry-run]

Fetches DLD open-data Ejari rent contracts, keeps residential contracts in
mapped seller buildings, and refreshes public.rent_contracts for the fetched
registration-date window.

Environment:
  SHEET_URL or --sheet-url       Google Sheet CSV used to decide which buildings to import
  DLD_BUILDING_OVERRIDES_FILE    Optional JSON file mapping seller buildings to DLD aliases
  DLD_BUILDING_REGISTRY_FILE     Optional building registry JSON with canonical names and aliases
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
    liveDays: Number(process.env.DLD_RENTS_LIVE_DAYS || DEFAULT_LIVE_DAYS),
    sheetUrl: process.env.SHEET_URL || DEFAULT_SHEET_URL,
    registryFile: process.env.DLD_BUILDING_REGISTRY_FILE || DEFAULT_BUILDING_REGISTRY_FILE,
    overridesFile: process.env.DLD_BUILDING_OVERRIDES_FILE || null,
  };

  for (const argument of argv) {
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--live") options.live = true;
    else if (argument.startsWith("--days=")) {
      const value = Number(argument.slice("--days=".length).trim());
      if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid --days value: ${argument}`);
      options.liveDays = Math.floor(value);
    } else if (argument.startsWith("--sheet-url=")) options.sheetUrl = argument.slice("--sheet-url=".length).trim();
    else if (argument.startsWith("--registry=")) options.registryFile = argument.slice("--registry=".length).trim();
    else if (argument.startsWith("--overrides=")) options.overridesFile = argument.slice("--overrides=".length).trim();
    else if (!options.input) options.input = argument;
    else throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

async function fetchLiveRentsCsv(daysBack) {
  const toDate = new Date();
  toDate.setHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - Math.max(0, daysBack - 1));

  const body = {
    parameters: {
      P_FROM_DATE: formatDldDate(fromDate),
      P_TO_DATE: formatDldDate(toDate),
      P_DATE_TYPE: "0",
      P_IS_FREE_HOLD: "",
      P_VERSION: "",
      P_AREA_ID: "",
      P_USAGE_ID: "",
      P_PROP_TYPE_ID: "",
      P_TAKE: "-1",
      P_SKIP: "",
      P_SORT: "",
    },
    labels: {},
  };

  const response = await fetch(DLD_RENTS_EXPORT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`Failed to fetch live DLD rents export (${response.status})`);

  const csvText = await response.text();
  const trimmed = csvText.trim();
  if (!trimmed || trimmed.startsWith("<!DOCTYPE html")) {
    throw new Error("Live DLD rents export returned an unexpected response.");
  }
  // Valid-but-empty windows come back as a JSON envelope instead of CSV.
  if (trimmed.startsWith("{")) {
    if (trimmed.includes("NO_DATA_FOUND")) return { csvText: "", period: buildPeriod(fromDate, toDate) };
    throw new Error(`Live DLD rents export returned an error payload: ${trimmed.slice(0, 200)}`);
  }

  return { csvText, period: buildPeriod(fromDate, toDate) };
}

function buildPeriod(fromDate, toDate) {
  return { fromDate: formatLocalIsoDate(fromDate), toDate: formatLocalIsoDate(toDate) };
}

async function readTextFromSource(source) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Failed to fetch ${source} (${response.status})`);
    return response.text();
  }
  return fs.readFile(source, "utf8");
}

function resolveRentColumns(headers) {
  return Object.fromEntries(
    Object.entries(RENT_COLUMN_ALIASES).map(([key, aliases]) => [key, inferColumn(headers, aliases)]),
  );
}

function buildContractDedupeKey(record, columns) {
  const contractNumber = String(record[columns.contractNumber] || "").trim();
  const versionNumber = String(record[columns.versionNumber] || "").trim();
  if (contractNumber) return `${contractNumber}:${versionNumber}`;
  return null;
}

async function syncIntoSupabase({ contractsByKey, targets, envMap, dryRun, period }) {
  const supabaseUrl = getEnvValue(envMap, ["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  const serviceRoleKey = getEnvValue(envMap, ["SUPABASE_SERVICE_ROLE_KEY"]);

  if (!supabaseUrl || !serviceRoleKey) {
    if (dryRun) return { synced: false, reason: "Missing Supabase credentials in dry-run mode." };
    throw new Error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  if (dryRun) return { synced: false, reason: "Dry run enabled." };

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const buildingKeys = Object.keys(contractsByKey);
  if (!buildingKeys.length) return { synced: true, buildingsInserted: 0, contractsInserted: 0 };

  // The FK requires a buildings row per key; insert missing ones without
  // touching metadata the sales import owns.
  const buildingRows = buildingKeys.map((key) => ({
    key,
    search_name: targets.get(key)?.name || key,
    location_name: targets.get(key)?.name || null,
  }));
  const { error: buildingsError } = await supabase
    .from("buildings")
    .upsert(buildingRows, { onConflict: "key", ignoreDuplicates: true });
  if (buildingsError) throw new Error(buildingsError.message);

  // Refresh only the fetched registration window so re-imports stay idempotent
  // while history from earlier imports is preserved.
  let deleteQuery = supabase.from("rent_contracts").delete().in("building_key", buildingKeys);
  if (period?.fromDate) deleteQuery = deleteQuery.gte("registration_date", period.fromDate);
  if (period?.toDate) deleteQuery = deleteQuery.lte("registration_date", period.toDate);
  const { error: deleteError } = await deleteQuery;
  if (deleteError) throw new Error(deleteError.message);

  let insertedContracts = 0;
  let batch = [];
  for (const contracts of Object.values(contractsByKey)) {
    for (const contract of contracts) {
      batch.push(contract);
      if (batch.length >= INSERT_BATCH_SIZE) {
        const { error } = await supabase.from("rent_contracts").insert(batch);
        if (error) throw new Error(error.message);
        insertedContracts += batch.length;
        batch = [];
      }
    }
  }
  if (batch.length) {
    const { error } = await supabase.from("rent_contracts").insert(batch);
    if (error) throw new Error(error.message);
    insertedContracts += batch.length;
  }

  return { synced: true, buildingsInserted: buildingRows.length, contractsInserted: insertedContracts };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (!options.input && !options.live) {
    printHelp();
    throw new Error("Missing rents CSV input path/URL or --live.");
  }

  const envMap = await readEnvMap();
  const overrides = await loadBuildingOverrides(options.overridesFile);
  const registryAliases = await loadRegistryAliases(options.registryFile);

  console.log("Loading seller sheet...");
  const { targets } = await loadTargetBuildings(options.sheetUrl, overrides, registryAliases);
  console.log(`Loaded ${targets.size} target buildings from seller sheet.`);
  const addedLiveTargets = await addSupabaseLeadTargets(targets, envMap, overrides, registryAliases);
  console.log(`Added ${addedLiveTargets} target buildings from live Seller Signal leads.`);
  const aliasLookup = buildTargetAliasLookup(targets);

  console.log("Loading DLD rents CSV...");
  let csvText = "";
  let period = null;
  if (options.live) {
    const liveExport = await fetchLiveRentsCsv(options.liveDays);
    csvText = liveExport.csvText;
    period = liveExport.period;
    console.log(`Fetched live DLD rents export for ${period.fromDate} to ${period.toDate}.`);
  } else {
    csvText = await readTextFromSource(options.input);
  }

  const rows = parseCsvText(csvText);
  const { headers, records } = rowsToObjects(rows);
  const columns = records.length ? resolveRentColumns(headers) : {};

  if (records.length) {
    if (!columns.project && !columns.masterProject) {
      throw new Error("Could not find Project or Master Project columns in the rents CSV.");
    }
    if (!columns.registrationDate || !columns.annualAmount) {
      throw new Error("Could not find Registration Date and Annual Amount columns in the rents CSV.");
    }
  }

  const contractsByKey = {};
  const seenContracts = new Set();
  const unmatchedExamples = new Set();
  let residentialRows = 0;
  let matchedRows = 0;
  let skippedInvalidRows = 0;

  for (const record of records) {
    const usage = String(record[columns.usage] || "").trim().toLowerCase();
    if (usage && usage !== "residential") continue;
    residentialRows += 1;

    const registrationDate = parseDateValue(record[columns.registrationDate]);
    if (!registrationDate) {
      skippedInvalidRows += 1;
      continue;
    }

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

    const annualAmount = parseNumber(record[columns.annualAmount]);
    if (annualAmount === null || annualAmount <= 0) {
      skippedInvalidRows += 1;
      continue;
    }

    const dedupeKey = buildContractDedupeKey(record, columns);
    if (dedupeKey && seenContracts.has(dedupeKey)) continue;
    if (dedupeKey) seenContracts.add(dedupeKey);

    const startDate = parseDateValue(record[columns.startDate]);
    const endDate = parseDateValue(record[columns.endDate]);
    matchedRows += 1;

    (contractsByKey[match.matchedKey] ||= []).push({
      building_key: match.matchedKey,
      annual_amount: annualAmount,
      contract_amount: parseNumber(record[columns.contractAmount]),
      registration_date: formatLocalIsoDate(registrationDate),
      start_date: startDate ? formatLocalIsoDate(startDate) : null,
      end_date: endDate ? formatLocalIsoDate(endDate) : null,
      version: String(record[columns.version] || "").trim() || null,
      rooms: String(record[columns.rooms] || "").trim() || null,
      actual_area_sqm: parseNumber(record[columns.actualArea]),
      prop_type: String(record[columns.propType] || "").trim() || null,
      prop_sub_type: String(record[columns.propSubType] || "").trim() || null,
      usage: String(record[columns.usage] || "").trim() || null,
      location_name: String(record[columns.area] || "").trim() || null,
      contract_number: String(record[columns.contractNumber] || "").trim() || null,
    });
  }

  const matchedBuildings = Object.entries(contractsByKey)
    .map(([key, contracts]) => ({ buildingKey: key, contractCount: contracts.length }))
    .sort((left, right) => right.contractCount - left.contractCount);

  console.log(`Rows scanned: ${records.length}, residential: ${residentialRows}, matched: ${matchedRows}.`);
  console.log(`Matched buildings: ${matchedBuildings.length}.`);
  for (const building of matchedBuildings.slice(0, 15)) {
    console.log(`  - ${building.buildingKey}: ${building.contractCount} contracts`);
  }
  if (unmatchedExamples.size) {
    console.log(`Sample unmatched projects (${unmatchedExamples.size} shown):`);
    for (const example of [...unmatchedExamples].slice(0, 10)) console.log(`  - ${example}`);
  }

  const syncSummary = await syncIntoSupabase({
    contractsByKey,
    targets,
    envMap,
    dryRun: options.dryRun,
    period,
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    input: options.live ? "live" : options.input,
    livePeriod: period,
    targetBuildings: targets.size,
    rowsScanned: records.length,
    residentialRows,
    matchedRows,
    skippedInvalidRows,
    matchedBuildings,
    sync: syncSummary,
  };
  await fs.mkdir("reports", { recursive: true });
  await fs.writeFile(SUMMARY_FILE, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(`Summary written to ${SUMMARY_FILE}`);

  if (syncSummary.synced) {
    console.log(`Supabase synced: ${syncSummary.buildingsInserted} buildings ensured, ${syncSummary.contractsInserted} rent contracts.`);
  } else {
    console.log(`Supabase sync skipped: ${syncSummary.reason}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
