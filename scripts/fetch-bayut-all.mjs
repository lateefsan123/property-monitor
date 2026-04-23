import fs from "node:fs/promises";
import path from "node:path";
import {
  extractLocationId,
  extractLocationName,
  fetchJsonWithRetry,
  formatDate,
  pickBestLocation,
  readApiKeyFromDotEnv,
  readDotEnv,
  sleep,
  toInt,
  toList,
} from "./lib/bayut-common.mjs";
import {
  loadBuildingTargets,
  syncBayutToSupabase,
} from "./lib/fetch-bayut-all-utils.mjs";

const DEFAULT_BUILDINGS_FILE = "public/data/downtown-dubai-building-registry.json";
const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1-DgZjG5T93t5zmrHmyekKkOLwCRIYEMMOK4AbOrYOVU/export?format=csv&gid=865690319";
const BASE_URL = "https://uae-real-estate2.p.rapidapi.com";
const API_HOST = "uae-real-estate2.p.rapidapi.com";
const OUTPUT_FILE = "public/data/bayut-transactions.json";

function buildTransactionsRequestBody(locationId, startDate, endDate) {
  return {
    locations_ids: [locationId],
    start_date: startDate,
    end_date: endDate,
    purpose: "for-sale",
    category: "residential",
    completion_status: "completed",
    sort_by: "date",
    order: "desc",
  };
}

function fetchBayutJson(url, options, retries) {
  return fetchJsonWithRetry(url, options, {
    retries,
    requestName: "bayut_api",
    onRateLimit: ({ delay }) => {
      console.log(`  429 rate limited, waiting ${delay}ms...`);
    },
    buildErrorMessage: ({ response, responseText }) => `API ${response.status}: ${responseText.slice(0, 200)}`,
  });
}

async function resolveLocation(searchCandidates, apiHeaders, retries) {
  for (const candidate of searchCandidates) {
    const locationsPayload = await fetchBayutJson(
      `${BASE_URL}/locations_search?query=${encodeURIComponent(candidate)}`,
      { method: "GET", headers: apiHeaders },
      retries,
    );
    const best = pickBestLocation(toList(locationsPayload), candidate);
    if (best) return best;
  }
  return null;
}

async function fetchTransactionsForLocation(locationId, apiHeaders, startDate, endDate, retries, requestDelayMs) {
  const transactions = [];
  let page = 0;

  while (true) {
    const payload = await fetchBayutJson(
      `${BASE_URL}/transactions?page=${page}`,
      {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(buildTransactionsRequestBody(locationId, startDate, endDate)),
      },
      retries,
    );

    const pageTransactions = toList(payload);
    transactions.push(...pageTransactions);
    if (pageTransactions.length < 20) {
      return {
        transactions,
        pages: page + 1,
      };
    }

    page += 1;
    if (requestDelayMs > 0) await sleep(requestDelayMs);
  }
}

async function main() {
  const dotEnv = await readDotEnv();
  const apiKey = process.env.RAPIDAPI_KEY
    || process.env.VITE_RAPIDAPI_KEY
    || dotEnv.RAPIDAPI_KEY
    || dotEnv.VITE_RAPIDAPI_KEY
    || await readApiKeyFromDotEnv();
  if (!apiKey) throw new Error("Missing RAPIDAPI_KEY");

  const buildingsFile = process.env.BUILDINGS_FILE || dotEnv.BUILDINGS_FILE || DEFAULT_BUILDINGS_FILE;
  const sheetUrl = process.env.SHEET_URL || dotEnv.SHEET_URL || DEFAULT_SHEET_URL;
  const monthWindow = Math.max(1, toInt(process.env.BAYUT_MONTH_WINDOW, 6));
  const requestDelayMs = Math.max(0, toInt(process.env.REQUEST_DELAY_MS, 1200));
  const retries = Math.max(0, toInt(process.env.REQUEST_RETRIES, 4));
  const apiHeaders = {
    "x-rapidapi-key": apiKey,
    "x-rapidapi-host": API_HOST,
    "Content-Type": "application/json",
  };

  const now = new Date();
  const startWindow = new Date(now.getFullYear(), now.getMonth() - monthWindow, now.getDate());
  const startDate = formatDate(startWindow);
  const endDate = formatDate(now);

  const targetSource = await loadBuildingTargets(buildingsFile, sheetUrl);
  const entries = targetSource.entries;
  console.log(`Loading ${entries.length} buildings from ${targetSource.sourceLabel} for a rolling ${monthWindow}-month Bayut window (${startDate} -> ${endDate})...`);

  const buildings = {};
  let succeeded = 0;
  let failed = 0;
  const errors = [];

  for (let index = 0; index < entries.length; index += 1) {
    const {
      buildingKey,
      searchName,
      searchCandidates,
      project,
      buildingType,
      status,
    } = entries[index];
    console.log(`[${index + 1}/${entries.length}] ${searchName}`);

    if (index > 0 && requestDelayMs > 0) await sleep(requestDelayMs);

    try {
      const location = await resolveLocation(searchCandidates, apiHeaders, retries);
      if (!location) throw new Error("No location match");

      const locationId = extractLocationId(location);
      if (!locationId) throw new Error("Location has no ID");

      if (requestDelayMs > 0) await sleep(requestDelayMs);

      const { transactions, pages } = await fetchTransactionsForLocation(
        locationId,
        apiHeaders,
        startDate,
        endDate,
        retries,
        requestDelayMs,
      );

      buildings[buildingKey] = {
        searchName,
        locationName: extractLocationName(location),
        locationId,
        project,
        buildingType,
        status,
        transactions,
      };
      console.log(`  -> ${transactions.length} transactions (${pages} pages)`);
      succeeded += 1;
    } catch (error) {
      console.error(`  -> ERROR: ${error.message}`);
      errors.push({ building: searchName, buildingKey, error: error.message });
      failed += 1;
    }
  }

  const totalTransactions = Object.values(buildings).reduce(
    (sum, building) => sum + building.transactions.length,
    0,
  );

  const supabaseUrl = process.env.SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || dotEnv.SUPABASE_URL
    || dotEnv.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    || dotEnv.SUPABASE_SERVICE_ROLE_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || dotEnv.VITE_SUPABASE_ANON_KEY;

  await syncBayutToSupabase({
    supabaseUrl,
    supabaseKey,
    buildings,
  });

  const output = {
    generatedAt: new Date().toISOString(),
    period: { startDate, endDate },
    summary: { totalBuildings: entries.length, succeeded, failed, totalTransactions },
    buildings,
    errors,
  };

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf8");

  console.log(`\nDone! Also written to ${OUTPUT_FILE}`);
  console.log(`Buildings: ${succeeded}/${entries.length} succeeded`);
  console.log(`Total transactions: ${totalTransactions}`);
  if (errors.length) console.log(`Errors: ${errors.length}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      "## Bayut Batch Fetch",
      `- Date window: ${startDate} to ${endDate}`,
      `- Buildings: ${succeeded}/${entries.length} succeeded`,
      `- Total transactions: ${totalTransactions}`,
      `- Errors: ${errors.length}`,
    ].join("\n");
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, "utf8");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
