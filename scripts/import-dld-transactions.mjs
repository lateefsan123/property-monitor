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
