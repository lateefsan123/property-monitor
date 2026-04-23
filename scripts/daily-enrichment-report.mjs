import fs from "node:fs/promises";
import path from "node:path";
import {
  extractLocationId,
  extractLocationName,
  fetchJsonWithRetry,
  formatDate,
  parseCsvText,
  pickBestLocation,
  readApiKeyFromDotEnv,
  rowsToObjects,
  sleep,
  toInt,
  toList,
} from "./lib/bayut-common.mjs";
import {
  buildLeadGroups,
  inferMapping,
  scoreHeaders,
  summarizeTransactions,
} from "./lib/daily-enrichment-utils.mjs";

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1-DgZjG5T93t5zmrHmyekKkOLwCRIYEMMOK4AbOrYOVU/export?format=csv&gid=865690319";
const BASE_URL = "https://uae-real-estate2.p.rapidapi.com";
const API_HOST = "uae-real-estate2.p.rapidapi.com";

const COLUMN_ALIASES = {
  name: ["name", "seller", "seller name", "owner", "owner name", "client", "lead name", "full name"],
  building: ["building", "tower", "project", "community", "building name", "tower name"],
  bedroom: ["bedroom", "bedrooms", "beds", "bed", "unit type", "bhk"],
  status: ["status", "stage", "category", "lead status", "pipeline", "contact status"],
  lastContact: ["last contact", "last contact date", "contact date", "last followup", "last follow up", "last message", "last contacted", "date"],
};

function createUsageTracker() {
  return {
    requests: {
      logical: 0,
      attempts: 0,
      retry429: 0,
      byEndpoint: {
        locations_search: 0,
        transactions: 0,
      },
      byStatus: {},
    },
  };
}

function createTrackedFetcher(usage, retries) {
  return (url, options, endpoint) => {
    usage.requests.logical += 1;
    usage.requests.byEndpoint[endpoint] = (usage.requests.byEndpoint[endpoint] || 0) + 1;

    return fetchJsonWithRetry(url, options, {
      retries,
      requestName: endpoint,
      onAttempt: () => {
        usage.requests.attempts += 1;
      },
      onResponse: ({ response }) => {
        usage.requests.byStatus[response.status] = (usage.requests.byStatus[response.status] || 0) + 1;
      },
      onRateLimit: () => {
        usage.requests.retry429 += 1;
      },
      buildErrorMessage: ({ response, json }) => {
        const message = json?.message || json?.raw || `HTTP ${response.status}`;
        return `${endpoint} failed (${response.status}): ${message}`;
      },
    });
  };
}

function buildTransactionsRequestBody(locationId, startDate, endDate, beds) {
  return {
    locations_ids: [locationId],
    start_date: startDate,
    end_date: endDate,
    beds: beds || undefined,
    purpose: "for-sale",
    category: "residential",
    completion_status: "completed",
    sort_by: "date",
    order: "desc",
  };
}

async function main() {
  const apiKey = process.env.RAPIDAPI_KEY || process.env.VITE_RAPIDAPI_KEY || await readApiKeyFromDotEnv();
  if (!apiKey) throw new Error("Missing RAPIDAPI_KEY secret");

  const sheetUrl = process.env.SHEET_URL || DEFAULT_SHEET_URL;
  const groupLimit = Math.max(0, toInt(process.env.ENRICH_GROUP_LIMIT, 0));
  const requestDelayMs = Math.max(0, toInt(process.env.REQUEST_DELAY_MS, 1200));
  const retries = Math.max(0, toInt(process.env.REQUEST_RETRIES, 4));
  const reportDir = process.env.REPORT_DIR || "reports";
  const failOnError = String(process.env.FAIL_ON_ERROR || "0") === "1";

  const usage = createUsageTracker();
  const fetchWithRetry = createTrackedFetcher(usage, retries);
  const apiHeaders = {
    "x-rapidapi-key": apiKey,
    "x-rapidapi-host": API_HOST,
    "Content-Type": "application/json",
  };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const startDate = formatDate(monthStart);
  const endDate = formatDate(now);

  const sheetResponse = await fetch(sheetUrl);
  if (!sheetResponse.ok) throw new Error(`Sheet fetch failed (${sheetResponse.status})`);

  const csvText = await sheetResponse.text();
  const rows = parseCsvText(csvText);
  const { headers, records } = rowsToObjects(rows, {
    getHeaderScore: (candidateHeaders) => scoreHeaders(candidateHeaders, COLUMN_ALIASES),
  });
  const mapping = inferMapping(headers, COLUMN_ALIASES);

  if (!mapping.name || !mapping.building || !mapping.status || !mapping.lastContact) {
    throw new Error("Could not detect required columns (name, building, status, date)");
  }

  const { leads, groups: allGroups } = buildLeadGroups(records, mapping);
  const activeGroups = groupLimit > 0 ? allGroups.slice(0, groupLimit) : allGroups;
  if (!activeGroups.length) throw new Error("No groups to process");

  const locationByBuilding = new Map();
  const groupResults = [];
  const errors = [];

  for (let index = 0; index < activeGroups.length; index += 1) {
    const group = activeGroups[index];

    if (index > 0 && requestDelayMs > 0) await sleep(requestDelayMs);

    try {
      let location = locationByBuilding.get(group.buildingKey) || null;
      if (!location) {
        const locationsPayload = await fetchWithRetry(
          `${BASE_URL}/locations_search?query=${encodeURIComponent(group.searchName)}`,
          { method: "GET", headers: apiHeaders },
          "locations_search",
        );
        const best = pickBestLocation(toList(locationsPayload), group.searchName);
        if (!best) throw new Error(`No location match for "${group.searchName}"`);

        location = best;
        locationByBuilding.set(group.buildingKey, location);
      }

      const locationId = extractLocationId(location);
      if (!locationId) throw new Error("Location has no ID");

      if (requestDelayMs > 0) await sleep(requestDelayMs);

      const strictPayload = await fetchWithRetry(
        `${BASE_URL}/transactions?page=0`,
        {
          method: "POST",
          headers: apiHeaders,
          body: JSON.stringify(buildTransactionsRequestBody(locationId, startDate, endDate, group.beds)),
        },
        "transactions",
      );

      let transactions = toList(strictPayload);
      let usedFallback = false;

      if (!transactions.length && group.beds?.length) {
        usedFallback = true;
        if (requestDelayMs > 0) await sleep(Math.max(400, Math.floor(requestDelayMs / 2)));

        const fallbackPayload = await fetchWithRetry(
          `${BASE_URL}/transactions?page=0`,
          {
            method: "POST",
            headers: apiHeaders,
            body: JSON.stringify(buildTransactionsRequestBody(locationId, startDate, endDate)),
          },
          "transactions",
        );
        transactions = toList(fallbackPayload);
      }

      groupResults.push({
        groupKey: group.groupKey,
        searchName: group.searchName,
        leadCount: group.leadCount,
        beds: group.beds,
        usedFallback,
        locationName: extractLocationName(location),
        locationId,
        metrics: summarizeTransactions(transactions),
      });
    } catch (error) {
      errors.push({
        groupKey: group.groupKey,
        searchName: group.searchName,
        leadCount: group.leadCount,
        message: error.message,
      });
    }
  }

  const totals = {
    leadsWithBuilding: leads.length,
    totalGroups: allGroups.length,
    groupsProcessed: activeGroups.length,
    groupsSucceeded: groupResults.length,
    groupsFailed: errors.length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    sheetUrl,
    period: { startDate, endDate },
    config: { groupLimit, requestDelayMs, retries },
    totals,
    usage,
    groups: groupResults,
    errors,
  };

  await fs.mkdir(reportDir, { recursive: true });
  const reportFile = path.join(reportDir, `daily-enrichment-${endDate}.json`);
  await fs.writeFile(reportFile, JSON.stringify(report, null, 2), "utf8");

  console.log(`Report written: ${reportFile}`);
  console.log(`Groups: ${totals.groupsSucceeded}/${totals.groupsProcessed} succeeded`);
  console.log(`Requests (logical): ${usage.requests.logical}`);
  console.log(`Requests (attempts): ${usage.requests.attempts}`);
  console.log(`429 retries: ${usage.requests.retry429}`);

  const summary = [
    "## Daily Enrichment Report",
    "",
    `- Date window: ${startDate} to ${endDate}`,
    `- Groups processed: ${totals.groupsProcessed}`,
    `- Groups succeeded: ${totals.groupsSucceeded}`,
    `- Groups failed: ${totals.groupsFailed}`,
    `- API requests (logical): ${usage.requests.logical}`,
    `- API requests (attempts): ${usage.requests.attempts}`,
    `- 429 retries: ${usage.requests.retry429}`,
    `- Report file: \`${reportFile}\``,
  ].join("\n");

  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, "utf8");
  }

  if (groupResults.length === 0) {
    throw new Error("No groups succeeded");
  }
  if (failOnError && errors.length > 0) {
    throw new Error(`Run had ${errors.length} group errors`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
